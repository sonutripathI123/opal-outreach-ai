import { prisma } from '@/lib/prisma';
import { PredictHqClient } from '@/lib/discovery/predicthq';
import { EventIntelligenceEngine } from '@/lib/ai/events';
import { logActivity, createNotification } from '@/lib/activity-logger';

export interface EventDiscoveryResult {
  locationsScanned: number;
  candidatesFound: number;
  eventsImported: number;
  notes: string[];
}

const MAX_NEW_EVENTS_PER_LOCATION = 5; // keep each run bounded

/**
 * Real, live event discovery: scans every active ServiceLocation via
 * PredictHQ, skips events already in the database, and creates Event +
 * research + opportunity records for genuinely new ones. PredictHQ does not
 * supply organiser contact details, so — same as the manual Location Event
 * Radar — no Contact/EmailDraft is fabricated here; a human adds the real
 * organiser afterwards to generate a draft.
 */
export async function discoverEventsForActiveLocations(): Promise<EventDiscoveryResult> {
  const notes: string[] = [];
  const predictHqKey = process.env.PREDICTHQ_API_KEY || '';

  if (!predictHqKey) {
    notes.push(
      'No PREDICTHQ_API_KEY configured — automatic event discovery is not connected. Add one to .env, or discover events manually via the Location Event Radar.'
    );
    return { locationsScanned: 0, candidatesFound: 0, eventsImported: 0, notes };
  }

  const locations = await prisma.serviceLocation.findMany({ where: { isActive: true } });
  if (locations.length === 0) {
    notes.push('No active service locations configured — add one under Service Locations before running discovery.');
    return { locationsScanned: 0, candidatesFound: 0, eventsImported: 0, notes };
  }

  const existingEvents = await prisma.event.findMany({ select: { name: true } });
  const existingNames = new Set(existingEvents.map((e) => e.name.toLowerCase().trim()));

  let candidatesFound = 0;
  let eventsImported = 0;
  const importedNames: string[] = [];

  for (const loc of locations) {
    const locationQuery = `${loc.cityName}, ${loc.state}`;
    let candidates;
    try {
      candidates = await PredictHqClient.searchEventsByLocation(locationQuery, predictHqKey);
    } catch (e: any) {
      notes.push(`PredictHQ search failed for ${locationQuery}: ${e?.message || 'unknown error'}`);
      continue;
    }

    const newCandidates = candidates.filter((ev) => !existingNames.has(ev.name.toLowerCase().trim()));
    candidatesFound += newCandidates.length;

    for (const ev of newCandidates.slice(0, MAX_NEW_EVENTS_PER_LOCATION)) {
      try {
        const slug =
          ev.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

        const analysis = EventIntelligenceEngine.analyzeEvent({
          name: ev.name,
          eventType: ev.eventType,
          startDate: ev.startDate,
          endDate: ev.endDate,
          venueName: ev.venueName,
          venueAddress: ev.venueAddress,
          city: ev.city || loc.cityName,
          state: ev.state || loc.state,
          expectedAttendance: ev.expectedAttendance,
          vipPresenceLikelihood: ev.vipPresenceLikelihood,
          sourceUrl: ev.sourceUrl,
        });

        const createdEvent = await prisma.event.create({
          data: {
            name: ev.name,
            slug,
            eventType: ev.eventType,
            startDate: new Date(ev.startDate),
            endDate: ev.endDate ? new Date(ev.endDate) : null,
            venueName: ev.venueName,
            venueAddress: ev.venueAddress,
            suburb: ev.suburb || loc.cityName,
            city: ev.city || loc.cityName,
            state: ev.state || loc.state,
            expectedAttendance: ev.expectedAttendance,
            vipPresenceLikelihood: ev.vipPresenceLikelihood,
            sourceUrl: ev.sourceUrl,
            status: 'DISCOVERED',
            priority: analysis.priority,
            opportunityScore: analysis.score,
          },
        });

        await prisma.eventResearch.create({
          data: {
            eventId: createdEvent.id,
            summary: analysis.summary,
            transportationDemandSignals: JSON.stringify(analysis.transportationDemandSignals),
            vipExecutiveRelevance: analysis.vipExecutiveRelevance,
            groupTransferPotential: analysis.groupTransferPotential,
            airportTransferRelevance: analysis.airportTransferRelevance,
            evidenceSources: JSON.stringify(analysis.evidenceSources),
            confidenceScore: 0.9,
          },
        });

        await prisma.eventOpportunity.create({
          data: {
            eventId: createdEvent.id,
            score: analysis.score,
            scoreBreakdown: JSON.stringify(analysis.scoreBreakdown),
            priority: analysis.priority,
            whyRelevant: analysis.whyRelevant,
            recommendedServices: JSON.stringify(analysis.recommendedServices),
            outreachAngle: analysis.outreachAngle,
          },
        });

        existingNames.add(ev.name.toLowerCase().trim());
        eventsImported++;
        importedNames.push(ev.name);
      } catch (err: any) {
        notes.push(`${ev.name}: ${err?.message || 'failed to import'}`);
      }
    }
  }

  if (eventsImported > 0) {
    await logActivity({
      action: 'DISCOVERY',
      entityType: 'EVENT',
      actor: 'BACKGROUND_SCHEDULER',
      description: `Automated PredictHQ scan across ${locations.length} active location(s) found ${candidatesFound} new event(s), imported ${eventsImported}. No organiser contacts — add one manually per event to generate a draft.`,
      details: { candidatesFound, eventsImported, eventNames: importedNames },
    });
    await createNotification({
      type: 'HIGH_PRIORITY_EVENT',
      title: `Auto-Discovery: ${eventsImported} New Events Found`,
      message: `${eventsImported} new event(s) discovered via PredictHQ across your active service locations. Add a real organiser contact on each to generate an outreach draft.`,
      linkUrl: '/events',
    });
  }

  return { locationsScanned: locations.length, candidatesFound, eventsImported, notes };
}
