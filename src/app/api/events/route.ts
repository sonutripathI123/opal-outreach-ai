import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EventIntelligenceEngine } from '@/lib/ai/events';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const eventType = searchParams.get('eventType');
    const priority = searchParams.get('priority');
    const city = searchParams.get('city');

    const whereClause: any = {};

    if (eventType && eventType !== 'ALL') {
      whereClause.eventType = eventType;
    }
    if (priority && priority !== 'ALL') {
      whereClause.priority = priority;
    }
    if (city && city !== 'ALL') {
      whereClause.city = city;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { venueName: { contains: search } },
        { organizerCompany: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        research: true,
        opportunity: true,
        contacts: true,
        emailDrafts: {
          orderBy: { createdAt: 'desc' },
        },
        sentEmails: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      eventType = 'CONFERENCE',
      startDate,
      endDate,
      venueName,
      venueAddress,
      suburb = 'Melbourne CBD',
      city = 'Melbourne',
      state = 'VIC',
      expectedAttendance = 500,
      vipPresenceLikelihood = 'HIGH',
      organizerName,
      organizerCompany,
      organizerWebsite,
      sourceUrl,
      organizerEmail,
    } = body;

    if (!name || !startDate || !venueName) {
      return NextResponse.json({ error: 'Event name, start date, and venue name are required' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

    // Run AI Event Intelligence
    const analysis = EventIntelligenceEngine.analyzeEvent({
      name,
      eventType,
      startDate,
      endDate,
      venueName,
      venueAddress,
      city,
      state,
      expectedAttendance: parseInt(expectedAttendance.toString()),
      vipPresenceLikelihood,
      organizerName,
      organizerCompany,
      organizerWebsite,
      sourceUrl,
    });

    // Create Event
    const event = await prisma.event.create({
      data: {
        name,
        slug,
        eventType,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        venueName,
        venueAddress: venueAddress || `${venueName}, ${city}`,
        suburb,
        city,
        state,
        expectedAttendance: parseInt(expectedAttendance.toString()),
        vipPresenceLikelihood,
        organizerName,
        organizerCompany,
        organizerWebsite,
        sourceUrl,
        status: 'DRAFTED',
        priority: analysis.priority,
        opportunityScore: analysis.score,
      },
    });

    // Create Event Research
    await prisma.eventResearch.create({
      data: {
        eventId: event.id,
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
        eventId: event.id,
        score: analysis.score,
        scoreBreakdown: JSON.stringify(analysis.scoreBreakdown),
        priority: analysis.priority,
        whyRelevant: analysis.whyRelevant,
        recommendedServices: JSON.stringify(analysis.recommendedServices),
        outreachAngle: analysis.outreachAngle,
      },
    });

    // Create Organizer Contact
    const finalContactName = organizerName || 'Event Logistics Director';
    const finalContactEmail = organizerEmail || `logistics@${organizerWebsite ? organizerWebsite.replace(/https?:\/\/(www\.)?/, '').split('/')[0] : 'eventhost.com.au'}`;

    const contact = await prisma.contact.create({
      data: {
        eventId: event.id,
        fullName: finalContactName,
        firstName: finalContactName.split(' ')[0],
        lastName: finalContactName.split(' ').slice(1).join(' '),
        jobTitle: 'Head of Event Operations & Logistics',
        department: 'Event Operations',
        seniorityLevel: 'DIRECTOR',
        email: finalContactEmail,
        emailSource: organizerEmail ? 'OFFICIAL_WEBSITE' : 'GENERIC_FALLBACK',
        emailConfidence: organizerEmail ? 0.95 : 0.8,
        verificationStatus: organizerEmail ? 'VERIFIED' : 'LIKELY',
        isPrimaryContact: true,
      },
    });

    // Fetch Business Profile
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

    // Generate 2-layer event personalized email draft
    const draftContent = EmailGenerator.generateEmail({
      businessProfile: bProfile,
      recipient: {
        name: contact.fullName,
        role: contact.jobTitle,
        companyName: organizerCompany || event.name,
        email: contact.email,
      },
      context: {
        type: 'EVENT',
        eventName: event.name,
        venue: event.venueName,
        location: event.city,
        whyRelevant: analysis.whyRelevant,
        recommendedServices: analysis.recommendedServices,
      },
    });

    const draft = await prisma.emailDraft.create({
      data: {
        eventId: event.id,
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

    // Log Activity & Notification
    await logActivity({
      action: 'DISCOVERY',
      entityType: 'EVENT',
      entityId: event.id,
      actor: 'ADMIN_USER',
      description: `Discovered upcoming event: ${event.name} at ${event.venueName} (Score: ${event.opportunityScore}/100).`,
      details: { score: event.opportunityScore, venue: event.venueName },
    });

    if (event.opportunityScore >= 80) {
      await createNotification({
        type: 'HIGH_PRIORITY_EVENT',
        title: `High-Priority Event Detected: ${event.name}`,
        message: `${event.name} at ${event.venueName} scored ${event.opportunityScore}/100. VIP transfer draft ready.`,
        linkUrl: '/review',
      });
    }

    return NextResponse.json({ success: true, event, draft, contact }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: error.message || 'Failed to create event' }, { status: 500 });
  }
}
