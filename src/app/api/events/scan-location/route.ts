import { NextRequest, NextResponse } from 'next/server';
import { KNOWN_LOCATION_EVENTS, DiscoveredEventItem } from '@/lib/data/events-catalog';
import { prisma } from '@/lib/prisma';
import { PredictHqClient } from '@/lib/discovery/predicthq';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locationQuery = 'South Wharf' } = body;
    const cleanQuery = locationQuery.trim().toLowerCase();

    const sourcesUsed: string[] = [];

    // 0. Live, location-based event discovery via PredictHQ — works for ANY
    //    Australian location, not just the curated catalog. Requires
    //    PREDICTHQ_API_KEY; returns [] and is silently skipped without one.
    //    PredictHQ does not supply organiser contact details, so these
    //    events come back with blank organiser fields — a human must
    //    research and add a real contact before a draft can be generated.
    let matchedEvents: DiscoveredEventItem[] = [];
    try {
      const predictHqKey = process.env.PREDICTHQ_API_KEY || '';
      if (predictHqKey) {
        const liveEvents = await PredictHqClient.searchEventsByLocation(locationQuery.trim(), predictHqKey);
        if (liveEvents.length > 0) {
          matchedEvents.push(...(liveEvents as unknown as DiscoveredEventItem[]));
          sourcesUsed.push('PREDICTHQ_LIVE');
        }
      }
    } catch (e) {
      console.warn('PredictHQ live event search failed:', e);
    }

    const liveCount = matchedEvents.length;

    // 1. Check known catalog for matches
    for (const [locKey, events] of Object.entries(KNOWN_LOCATION_EVENTS)) {
      if (cleanQuery.includes(locKey) || locKey.includes(cleanQuery)) {
        matchedEvents.push(...events);
      }
    }

    // Also match inside event venues, suburbs or names
    if (matchedEvents.length === 0) {
      for (const events of Object.values(KNOWN_LOCATION_EVENTS)) {
        for (const ev of events) {
          if (
            ev.venueName.toLowerCase().includes(cleanQuery) ||
            ev.suburb.toLowerCase().includes(cleanQuery) ||
            ev.city.toLowerCase().includes(cleanQuery) ||
            ev.name.toLowerCase().includes(cleanQuery)
          ) {
            if (!matchedEvents.some((m) => m.id === ev.id)) {
              matchedEvents.push(ev);
            }
          }
        }
      }
    }

    // Note: we intentionally do NOT fabricate placeholder events with made-up
    // organiser names/emails for unknown locations — sending to invented
    // addresses causes bounces and harms sender reputation. Unknown locations
    // simply return no events from the curated catalog.

    if (matchedEvents.length > liveCount) sourcesUsed.push('CURATED_LIST');

    // De-duplicate by name (live PredictHQ results take precedence).
    const seen = new Set<string>();
    matchedEvents = matchedEvents.filter((ev) => {
      const key = ev.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Check which events are already in our database
    const existingEvents = await prisma.event.findMany({
      select: { name: true, slug: true },
    });
    const existingNames = new Set(existingEvents.map((e) => e.name.toLowerCase()));

    const enrichedEvents = matchedEvents.map((ev) => ({
      ...ev,
      isAlreadyImported: existingNames.has(ev.name.toLowerCase()),
    }));

    return NextResponse.json({
      success: true,
      query: locationQuery,
      totalDiscovered: enrichedEvents.length,
      sources: sourcesUsed,
      events: enrichedEvents,
    });
  } catch (error: any) {
    console.error('Error scanning location for events:', error);
    return NextResponse.json({ error: 'Failed to scan location for events' }, { status: 500 });
  }
}
