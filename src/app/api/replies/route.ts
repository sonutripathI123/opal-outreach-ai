import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplyAnalyzer } from '@/lib/ai/reply-analyzer';
import { logActivity, createNotification } from '@/lib/activity-logger';

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
    const { sentEmailId, senderEmail, subject, bodyText } = body;

    if (!sentEmailId || !bodyText) {
      return NextResponse.json({ error: 'sentEmailId and bodyText are required' }, { status: 400 });
    }

    const sentEmail = await prisma.sentEmail.findUnique({
      where: { id: sentEmailId },
      include: { company: true, contact: true },
    });

    if (!sentEmail) {
      return NextResponse.json({ error: 'Sent email not found' }, { status: 404 });
    }

    // Run AI Reply Analysis & Intent Classification
    const analysis = ReplyAnalyzer.analyze(bodyText, {
      companyName: sentEmail.company?.name,
      contactName: sentEmail.recipientName,
    });

    // Create Reply Record
    const reply = await prisma.reply.create({
      data: {
        sentEmailId: sentEmail.id,
        companyId: sentEmail.companyId,
        contactId: sentEmail.contactId,
        senderEmail: senderEmail || sentEmail.recipientEmail,
        subject: subject || `Re: ${sentEmail.subject}`,
        bodyText,
        aiClassification: analysis.classification,
        aiExecutiveSummary: analysis.executiveSummary,
        aiDetectedIntent: analysis.detectedIntent,
        aiSuggestedAction: analysis.suggestedAction,
        aiDraftedReply: analysis.draftedReply,
        status: 'NEW',
      },
    });

    // Update sent email status
    await prisma.sentEmail.update({
      where: { id: sentEmail.id },
      data: { hasReply: true },
    });

    // Update company status if applicable
    if (sentEmail.companyId) {
      await prisma.company.update({
        where: { id: sentEmail.companyId },
        data: { status: 'REPLIED' },
      });
    }

    // AUTO-STOP RULE: Cancel scheduled follow-ups for this sent email
    await prisma.followUp.updateMany({
      where: {
        sentEmailId: sentEmail.id,
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
      description: `Inbound reply received from ${sentEmail.recipientName} (${sentEmail.recipientEmail}). Intent: ${analysis.classification}. Follow-ups halted.`,
      details: {
        classification: analysis.classification,
        intent: analysis.detectedIntent,
      },
    });

    await createNotification({
      type: 'REPLY_RECEIVED',
      title: `New Reply Received: ${sentEmail.recipientName} (${analysis.classification})`,
      message: analysis.executiveSummary,
      linkUrl: '/inbox',
    });

    return NextResponse.json({ success: true, reply }, { status: 201 });
  } catch (error: any) {
    console.error('Error processing reply:', error);
    return NextResponse.json({ error: 'Failed to process reply' }, { status: 500 });
  }
}
