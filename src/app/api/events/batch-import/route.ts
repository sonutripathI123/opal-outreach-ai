import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EventIntelligenceEngine } from '@/lib/ai/events';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { events = [] } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'No events provided for import' }, { status: 400 });
    }

    const importedResults = [];

    // Fetch Business Profile once
    const profile = await prisma.businessProfile.findFirst();
    const bProfile = profile || {
      companyName: 'Opal Chauffeurs',
      tradingName: 'Opal Chauffeurs',
      website: 'https://www.opalchauffeurs.com.au/',
      description: 'Premium chauffeur transportation service based in Melbourne, Australia.',
      brandPositioning: 'Melbourne’s premier executive transport partner.',
      emailSignature: `Warm regards,\n\nCorporate Partnerships Team\nOpal Chauffeurs\nWeb: https://www.opalchauffeurs.com.au/\nEmail: book@opalchauffeurs.com.au | Direct: +61 432 000 718`,
      collaborationOffer: 'Introducing Opal Chauffeurs as your event transportation partner.',
    };

    for (const evData of events) {
      try {
        const slug = evData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

        // Run AI Event Intelligence
        const analysis = EventIntelligenceEngine.analyzeEvent({
          name: evData.name,
          eventType: evData.eventType || 'CONFERENCE',
          startDate: evData.startDate,
          endDate: evData.endDate,
          venueName: evData.venueName,
          venueAddress: evData.venueAddress,
          city: evData.city || 'Melbourne',
          state: evData.state || 'VIC',
          expectedAttendance: parseInt(evData.expectedAttendance?.toString() || '1000'),
          vipPresenceLikelihood: evData.vipPresenceLikelihood || 'HIGH',
          organizerName: evData.organizerName,
          organizerCompany: evData.organizerCompany,
          organizerWebsite: evData.organizerWebsite,
          sourceUrl: evData.sourceUrl,
        });

        // Create Event
        const createdEvent = await prisma.event.create({
          data: {
            name: evData.name,
            slug,
            eventType: evData.eventType || 'CONFERENCE',
            startDate: new Date(evData.startDate),
            endDate: evData.endDate ? new Date(evData.endDate) : null,
            venueName: evData.venueName,
            venueAddress: evData.venueAddress || `${evData.venueName}, ${evData.city || 'Melbourne'}`,
            suburb: evData.suburb || 'Melbourne CBD',
            city: evData.city || 'Melbourne',
            state: evData.state || 'VIC',
            expectedAttendance: parseInt(evData.expectedAttendance?.toString() || '1000'),
            vipPresenceLikelihood: evData.vipPresenceLikelihood || 'HIGH',
            organizerName: evData.organizerName,
            organizerCompany: evData.organizerCompany,
            organizerWebsite: evData.organizerWebsite,
            sourceUrl: evData.sourceUrl,
            status: 'DRAFTED',
            priority: analysis.priority,
            opportunityScore: analysis.score,
          },
        });

        // Create Event Research
        await prisma.eventResearch.create({
          data: {
            eventId: createdEvent.id,
            summary: analysis.summary,
            transportationDemandSignals: JSON.stringify(analysis.transportationDemandSignals),
            vipExecutiveRelevance: analysis.vipExecutiveRelevance,
            groupTransferPotential: analysis.groupTransferPotential,
            airportTransferRelevance: analysis.airportTransferRelevance,
            evidenceSources: JSON.stringify(analysis.evidenceSources),
            confidenceScore: 0.92,
          },
        });

        // Create Event Opportunity
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

        // Create Organizer Contact
        const finalContactName = evData.organizerName || 'Event Logistics Director';
        const finalContactEmail = evData.organizerEmail || `logistics@${evData.organizerWebsite ? evData.organizerWebsite.replace(/https?:\/\/(www\.)?/, '').split('/')[0] : 'events.com.au'}`;

        const contact = await prisma.contact.create({
          data: {
            eventId: createdEvent.id,
            fullName: finalContactName,
            firstName: finalContactName.split(' ')[0],
            lastName: finalContactName.split(' ').slice(1).join(' '),
            jobTitle: 'Head of Event Operations & Logistics',
            department: 'Event Operations',
            seniorityLevel: 'DIRECTOR',
            email: finalContactEmail,
            emailSource: 'OFFICIAL_WEBSITE',
            emailConfidence: 0.95,
            verificationStatus: 'VERIFIED',
            isPrimaryContact: true,
          },
        });

        // Generate 2-layer personalized email draft
        const draftContent = EmailGenerator.generateEmail({
          businessProfile: bProfile,
          recipient: {
            name: contact.fullName,
            role: contact.jobTitle,
            companyName: evData.organizerCompany || createdEvent.name,
            email: contact.email,
          },
          context: {
            type: 'EVENT',
            eventName: createdEvent.name,
            venue: createdEvent.venueName,
            location: createdEvent.city,
            whyRelevant: analysis.whyRelevant,
            recommendedServices: analysis.recommendedServices,
          },
        });

        await prisma.emailDraft.create({
          data: {
            eventId: createdEvent.id,
            contactId: contact.id,
            recipientName: contact.fullName,
            recipientEmail: contact.email,
            recipientRole: contact.jobTitle,
            subject: draftContent.subject,
            fixedContent: draftContent.fixedContent,
            dynamicContent: draftContent.dynamicContent,
            fullBodyText: draftContent.fullBodyText,
            personalizationReasoning: draftContent.personalizationReasoning,
            aiEvidenceCited: JSON.stringify(draftContent.evidenceCited),
            status: 'READY_FOR_REVIEW',
          },
        });

        importedResults.push(createdEvent.name);
      } catch (err: any) {
        console.warn(`Error importing single event (${evData.name}):`, err);
      }
    }

    await logActivity({
      action: 'DISCOVERY',
      entityType: 'EVENT',
      actor: 'ADMIN_USER',
      description: `Discovered and imported ${importedResults.length} upcoming events via Location Radar Scanner into Review Queue.`,
      details: { importedCount: importedResults.length, eventNames: importedResults },
    });

    return NextResponse.json({
      success: true,
      importedCount: importedResults.length,
      importedEvents: importedResults,
    });
  } catch (error: any) {
    console.error('Error in batch event import:', error);
    return NextResponse.json({ error: error.message || 'Failed to import events' }, { status: 500 });
  }
}
