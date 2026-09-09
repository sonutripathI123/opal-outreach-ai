import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';
import { EmailDispatcher } from '@/lib/email/dispatcher';

export async function GET() {
  try {
    const followUps = await prisma.followUp.findMany({
      include: {
        sentEmail: {
          include: {
            company: true,
            contact: true,
          },
        },
        company: true,
        contact: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return NextResponse.json({ followUps });
  } catch (error: any) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { followUpId, action } = body; // action: 'SEND' | 'CANCEL'

    if (!followUpId) {
      return NextResponse.json({ error: 'followUpId is required' }, { status: 400 });
    }

    if (action === 'CANCEL') {
      const updated = await prisma.followUp.update({
        where: { id: followUpId },
        data: {
          status: 'CANCELLED',
          cancelReason: 'MANUAL_STOP',
        },
      });
      return NextResponse.json({ success: true, followUp: updated });
    }

    if (action === 'SEND') {
      const followUp = await prisma.followUp.findUnique({
        where: { id: followUpId },
        include: { sentEmail: true, contact: true, company: true },
      });

      if (!followUp) {
        return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
      }

      if (followUp.status === 'SENT') {
        return NextResponse.json({ error: 'This follow-up has already been sent' }, { status: 400 });
      }

      if (followUp.company?.status === 'DO_NOT_CONTACT') {
        await prisma.followUp.update({
          where: { id: followUpId },
          data: { status: 'CANCELLED', cancelReason: 'OPT_OUT' },
        });
        return NextResponse.json(
          { error: 'This company opted out / is marked Do Not Contact — follow-up cancelled instead of sent.' },
          { status: 400 }
        );
      }

      const recipientEmail = followUp.sentEmail?.recipientEmail || followUp.contact?.email;
      const recipientName = followUp.sentEmail?.recipientName || followUp.contact?.fullName || recipientEmail;

      if (!recipientEmail) {
        return NextResponse.json({ error: 'No recipient email available for this follow-up' }, { status: 400 });
      }

      // Actually dispatch the follow-up email via the configured provider.
      const dispatchResult = await EmailDispatcher.sendEmail({
        to: recipientEmail,
        toName: recipientName || undefined,
        subject: followUp.draftSubject,
        text: followUp.draftBody,
        replyTo: 'book@opalchauffeurs.com.au',
      });

      if (!dispatchResult.success) {
        return NextResponse.json(
          { error: `Follow-up not sent: ${dispatchResult.error || 'Email dispatch failed'}. Check your email provider in Settings.` },
          { status: 400 }
        );
      }

      const updated = await prisma.followUp.update({
        where: { id: followUpId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      await logActivity({
        action: 'EMAIL_SENT',
        entityType: 'SENT_EMAIL',
        entityId: followUp.sentEmailId,
        actor: 'ADMIN_USER',
        description: `Step ${followUp.stepNumber} follow-up sent to ${recipientEmail} via ${dispatchResult.mode}.`,
        details: { messageId: dispatchResult.messageId, mode: dispatchResult.mode },
      });

      return NextResponse.json({ success: true, followUp: updated, dispatchResult });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing follow-up action:', error);
    return NextResponse.json({ error: 'Failed to process follow-up' }, { status: 500 });
  }
}
