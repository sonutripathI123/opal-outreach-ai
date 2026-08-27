import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplyAnalyzer } from '@/lib/ai/reply-analyzer';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const replies = await prisma.reply.findMany({
      include: {
        sentEmail: {
          include: {
            draft: true,
          },
        },
        company: true,
        contact: true,
      },
      orderBy: { receivedAt: 'desc' },
    });

    return NextResponse.json({ replies });
  } catch (error: any) {
    console.error('Error fetching replies:', error);
    return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sentEmailId, draftId, senderEmail, subject, bodyText, prospectName, companyName } = body;

    if (!bodyText) {
      return NextResponse.json({ error: 'bodyText is required' }, { status: 400 });
    }

    let targetSentEmail: any = null;

    // 1. Try by sentEmailId
    if (sentEmailId) {
      targetSentEmail = await prisma.sentEmail.findUnique({
        where: { id: sentEmailId },
        include: { company: true, contact: true, event: true },
      });
    }

    // 2. If not found, try by draftId
    if (!targetSentEmail && draftId) {
      const draft = await prisma.emailDraft.findUnique({
        where: { id: draftId },
        include: { company: true, contact: true, event: true, sentEmail: true },
      });

      if (draft) {
        if (draft.sentEmail) {
          targetSentEmail = draft.sentEmail;
        } else {
          // Create SentEmail record on the fly for this draft
          targetSentEmail = await prisma.sentEmail.create({
            data: {
              draftId: draft.id,
              companyId: draft.companyId,
              eventId: draft.eventId,
              contactId: draft.contactId,
              recipientEmail: draft.recipientEmail,
              recipientName: draft.recipientName,
              subject: draft.subject,
              exactSentBody: draft.fullBodyText,
              deliveryStatus: 'DELIVERED',
            },
            include: { company: true, contact: true, event: true },
          });

          await prisma.emailDraft.update({
            where: { id: draft.id },
            data: { status: 'SENT', sentAt: new Date() },
          });
        }
      }
    }

    // 3. Fallback: Find any existing sentEmail or draft, or create mock
    if (!targetSentEmail) {
      const anySent = await prisma.sentEmail.findFirst({
        include: { company: true, contact: true, event: true },
      });
      if (anySent) {
        targetSentEmail = anySent;
      } else {
        // Find any draft to create sent email
        const anyDraft = await prisma.emailDraft.findFirst({
          include: { company: true, contact: true, event: true },
        });

        if (anyDraft) {
          targetSentEmail = await prisma.sentEmail.create({
            data: {
              draftId: anyDraft.id,
              companyId: anyDraft.companyId,
              eventId: anyDraft.eventId,
              contactId: anyDraft.contactId,
              recipientEmail: anyDraft.recipientEmail,
              recipientName: anyDraft.recipientName,
              subject: anyDraft.subject,
              exactSentBody: anyDraft.fullBodyText,
              deliveryStatus: 'DELIVERED',
            },
            include: { company: true, contact: true, event: true },
          });
        }
      }
    }

    const recipientDisplayName = targetSentEmail?.recipientName || prospectName || 'Elena Rostova';
    const targetCompName = targetSentEmail?.company?.name || targetSentEmail?.event?.name || companyName || 'Global Energy Expos';
    const finalSenderEmail = senderEmail || targetSentEmail?.recipientEmail || 'elena.rostova@globalenergyexpos.com.au';
    const finalSubject = subject || (targetSentEmail ? `Re: ${targetSentEmail.subject}` : 'Re: Executive Chauffeur Transportation');

    // Run AI Reply Analysis & Intent Classification
    const analysis = ReplyAnalyzer.analyze(bodyText, {
      companyName: targetCompName,
      contactName: recipientDisplayName,
    });

    if (!targetSentEmail) {
      return NextResponse.json({ error: 'No target email found to associate reply with' }, { status: 400 });
    }

    // Create Reply Record
    const reply = await prisma.reply.create({
      data: {
        sentEmailId: targetSentEmail.id,
        companyId: targetSentEmail.companyId,
        contactId: targetSentEmail.contactId,
        senderEmail: finalSenderEmail,
        subject: finalSubject,
        bodyText,
        aiClassification: analysis.classification,
        aiExecutiveSummary: analysis.executiveSummary,
        aiDetectedIntent: analysis.detectedIntent,
        aiSuggestedAction: analysis.suggestedAction,
        aiDraftedReply: analysis.draftedReply,
        status: 'NEW',
      },
      include: { company: true, contact: true },
    });

    // Update sent email status
    await prisma.sentEmail.update({
      where: { id: targetSentEmail.id },
      data: { hasReply: true },
    });

    // Update company status if applicable
    if (targetSentEmail.companyId) {
      await prisma.company.update({
        where: { id: targetSentEmail.companyId },
        data: { status: 'REPLIED' },
      });
    }

    // AUTO-STOP RULE: Cancel scheduled follow-ups for this sent email
    await prisma.followUp.updateMany({
      where: {
        sentEmailId: targetSentEmail.id,
        status: 'SCHEDULED',
      },
      data: {
        status: 'CANCELLED',
        cancelReason: 'REPLY_RECEIVED',
      },
    });

    // Activity Log & In-App Notification
    await logActivity({
      action: 'REPLY_RECEIVED',
      entityType: 'REPLY',
      entityId: reply.id,
      actor: 'AI_ENGINE',
      description: `Inbound reply received from ${recipientDisplayName} (${finalSenderEmail}). Intent: ${analysis.classification}. Follow-ups halted.`,
      details: {
        classification: analysis.classification,
        intent: analysis.detectedIntent,
      },
    });

    await createNotification({
      type: 'REPLY_RECEIVED',
      title: `New Reply Received: ${recipientDisplayName} (${analysis.classification})`,
      message: analysis.executiveSummary,
      linkUrl: '/inbox',
    });

    return NextResponse.json({ success: true, reply }, { status: 201 });
  } catch (error: any) {
    console.error('Error processing reply:', error);
    return NextResponse.json({ error: error.message || 'Failed to process reply' }, { status: 500 });
  }
}
