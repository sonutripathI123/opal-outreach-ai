import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailDispatcher } from '@/lib/email/dispatcher';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { responseText } = body;

    const reply = await prisma.reply.findUnique({
      where: { id },
      include: {
        company: true,
        contact: true,
        sentEmail: true,
      },
    });

    if (!reply) {
      return NextResponse.json({ error: 'Reply record not found' }, { status: 404 });
    }

    const finalBodyText = responseText || reply.aiDraftedReply || 'Thank you for your response. We look forward to assisting your team with luxury chauffeur transport in Melbourne.';
    const finalSubject = reply.subject.startsWith('Re:') ? reply.subject : `Re: ${reply.subject}`;
    const recipientEmail = reply.senderEmail || reply.sentEmail?.recipientEmail || reply.contact?.email;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'No recipient email address available' }, { status: 400 });
    }

    // Dispatch via Brevo API / Active Outgoing Engine
    const dispatchResult = await EmailDispatcher.sendEmail({
      to: recipientEmail,
      toName: reply.contact?.fullName || reply.sentEmail?.recipientName,
      subject: finalSubject,
      text: finalBodyText,
      replyTo: 'book@opalchauffeurs.com.au',
    });

    if (!dispatchResult.success) {
      return NextResponse.json(
        { error: dispatchResult.error || 'Failed to dispatch reply email' },
        { status: 500 }
      );
    }

    // Update Reply status to RESPONDED
    const updatedReply = await prisma.reply.update({
      where: { id },
      data: {
        status: 'RESPONDED',
        aiDraftedReply: finalBodyText,
      },
    });

    await logActivity({
      action: 'EMAIL_SENT',
      entityType: 'REPLY',
      entityId: reply.id,
      actor: 'ADMIN_USER',
      description: `Sent response email to ${recipientEmail} regarding "${finalSubject}".`,
      details: {
        messageId: dispatchResult.messageId,
        mode: dispatchResult.mode,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Response successfully dispatched to ${recipientEmail}!`,
      reply: updatedReply,
      messageId: dispatchResult.messageId,
    });
  } catch (error: any) {
    console.error('Error sending response to reply:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error sending response' },
      { status: 500 }
    );
  }
}
