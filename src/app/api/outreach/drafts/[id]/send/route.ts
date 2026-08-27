import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';
import { EmailDispatcher } from '@/lib/email/dispatcher';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const draft = await prisma.emailDraft.findUnique({
      where: { id },
      include: { company: true, event: true, contact: true },
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    // Check if already sent
    if (draft.status === 'SENT') {
      return NextResponse.json({ error: 'Email has already been sent' }, { status: 400 });
    }

    // 1. Dispatch real email via EmailDispatcher (Google Workspace SMTP / Fallback)
    const dispatchResult = await EmailDispatcher.sendEmail({
      to: draft.recipientEmail,
      toName: draft.recipientName,
      subject: draft.subject,
      text: draft.fullBodyText,
      replyTo: 'book@opalchauffeurs.com.au',
    });

    if (!dispatchResult.success) {
      console.warn('Real SMTP dispatch warning:', dispatchResult.error);
    }

    // 2. Create immutable SentEmail record
    const sentEmail = await prisma.sentEmail.create({
      data: {
        draftId: draft.id,
        companyId: draft.companyId,
        eventId: draft.eventId,
        contactId: draft.contactId,
        recipientEmail: draft.recipientEmail,
        recipientName: draft.recipientName,
        subject: draft.subject,
        exactSentBody: draft.fullBodyText,
        deliveryStatus: dispatchResult.success ? 'DELIVERED' : 'BOUNCED',
      },
    });

    // 3. Update Draft status
    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    // 4. Update Company status
    if (draft.companyId) {
      await prisma.company.update({
        where: { id: draft.companyId },
        data: { status: 'CONTACTED' },
      });
    }

    // 5. Update Event status
    if (draft.eventId) {
      await prisma.event.update({
        where: { id: draft.eventId },
        data: { status: 'CONTACTED' },
      });
    }

    // 6. Setup Automated Follow-Up Sequence (Day 5, Day 10)
    const now = Date.now();
    const day5 = new Date(now + 1000 * 60 * 60 * 24 * 5);
    const day10 = new Date(now + 1000 * 60 * 60 * 24 * 10);
    const recipientFirstName = draft.recipientName.split(' ')[0] || draft.recipientName;

    const followUpSignature = `Warm regards,\n\n${recipientFirstName},\n\nCorporate Partnerships Team\nOpal Chauffeurs\nWeb: https://www.opalchauffeurs.com.au/\nEmail: book@opalchauffeurs.com.au | Direct: +61 432 000 718`;

    await prisma.followUp.createMany({
      data: [
        {
          sentEmailId: sentEmail.id,
          companyId: draft.companyId,
          contactId: draft.contactId,
          stepNumber: 1,
          scheduledDate: day5,
          status: 'SCHEDULED',
          draftSubject: `Re: ${draft.subject}`,
          draftBody: `Hi ${recipientFirstName},\n\nFollowing up on my previous note regarding Opal Chauffeurs executive transport and flight-tracked airport transfers. Would you have 5 minutes this week for a brief introductory conversation?\n\n${followUpSignature}`,
        },
        {
          sentEmailId: sentEmail.id,
          companyId: draft.companyId,
          contactId: draft.contactId,
          stepNumber: 2,
          scheduledDate: day10,
          status: 'SCHEDULED',
          draftSubject: `Following up: Executive Chauffeur Services for ${recipientFirstName}`,
          draftBody: `Hi ${recipientFirstName},\n\nJust checking in one last time to see if Opal Chauffeurs could support your upcoming corporate travel or VIP event logistics. Please let me know if we can share our corporate rate schedule.\n\n${followUpSignature}`,
        },
      ],
    });

    // 7. Audit log
    await logActivity({
      action: 'EMAIL_SENT',
      entityType: 'SENT_EMAIL',
      entityId: sentEmail.id,
      actor: 'ADMIN_USER',
      description: `Initial personalized outreach email sent to ${draft.recipientName} (${draft.recipientEmail}) via ${dispatchResult.mode}. Follow-up cadence initiated.`,
      details: {
        recipientEmail: draft.recipientEmail,
        subject: draft.subject,
        sentEmailId: sentEmail.id,
        mode: dispatchResult.mode,
        messageId: dispatchResult.messageId,
      },
    });

    return NextResponse.json({ success: true, sentEmail, dispatchResult });
  } catch (error: any) {
    console.error('Error sending outreach:', error);
    return NextResponse.json({ error: error.message || 'Failed to send outreach email' }, { status: 500 });
  }
}
