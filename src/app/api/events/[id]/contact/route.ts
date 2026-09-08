import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

/**
 * Adds a real organiser contact to an event that was discovered without one
 * (e.g. via PredictHQ, which reports that an event exists but not who
 * organises it) and generates the AI outreach draft for that contact.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { organizerName, organizerCompany, organizerEmail } = body;

    if (!organizerEmail || !organizerName) {
      return NextResponse.json({ error: 'Organizer name and email are required' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: { opportunity: true, contacts: true },
    });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (event.contacts.length > 0) {
      return NextResponse.json({ error: 'This event already has an organizer contact' }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        eventId: event.id,
        fullName: organizerName,
        firstName: organizerName.split(' ')[0],
        lastName: organizerName.split(' ').slice(1).join(' '),
        jobTitle: 'Head of Event Operations & Logistics',
        department: 'Event Operations',
        seniorityLevel: 'DIRECTOR',
        email: organizerEmail.toLowerCase().trim(),
        emailSource: 'OFFICIAL_WEBSITE',
        emailConfidence: 0.9,
        verificationStatus: 'LIKELY',
        isPrimaryContact: true,
      },
    });

    const profile = await prisma.businessProfile.findFirst();
    const bProfile = {
      companyName: profile?.companyName || 'Opal Chauffeurs',
      tradingName: profile?.tradingName,
      website: profile?.website || 'https://www.opalchauffeurs.com.au/',
      description: profile?.description || 'Premium chauffeur transportation service based in Melbourne, Australia.',
      brandPositioning: profile?.brandPositioning || 'Melbourne’s premier executive transport partner.',
      emailSignature: profile?.emailSignature || 'Warm regards,\n\nInaya\nCorporate Partnerships Team\nOpal Chauffeurs',
      collaborationOffer: profile?.collaborationOffer || 'Introducing Opal Chauffeurs as your event transportation partner.',
    };

    let recommendedServices: string[] = [];
    try {
      if (event.opportunity?.recommendedServices) recommendedServices = JSON.parse(event.opportunity.recommendedServices);
    } catch {}

    const draftContent = await EmailGenerator.generateEmailSmart({
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
        whyRelevant: event.opportunity?.whyRelevant,
        recommendedServices,
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

    await logActivity({
      action: 'CONTACT_FOUND',
      entityType: 'EVENT',
      entityId: event.id,
      actor: 'ADMIN_USER',
      description: `Organizer contact ${organizerName} (${organizerEmail}) added to ${event.name} and outreach draft generated.`,
    });

    await createNotification({
      type: 'DRAFT_READY',
      title: `Draft Ready: ${event.name}`,
      message: `Outreach draft generated for ${organizerName} at ${event.name}.`,
      linkUrl: '/review',
    });

    return NextResponse.json({ success: true, contact, draft }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding event organizer contact:', error);
    return NextResponse.json({ error: error.message || 'Failed to add organizer contact' }, { status: 500 });
  }
}
