import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReplyAnalyzer } from '@/lib/ai/reply-analyzer';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

/**
 * Universal Inbound Email Webhook
 * Ingests inbound client replies from Brevo Inbound Webhook, SendGrid, Mailgun, Postmark, and Email Forwarders
 */
export async function POST(req: NextRequest) {
  try {
    // Optional shared-secret guard. When INBOUND_WEBHOOK_SECRET is configured,
    // callers must present it via the `x-webhook-secret` header or `?secret=`
    // query param. This keeps the public endpoint from being abused to inject
    // fake replies and silently cancel scheduled follow-ups.
    const expectedSecret = process.env.INBOUND_WEBHOOK_SECRET;
    if (expectedSecret) {
      const provided =
        req.headers.get('x-webhook-secret') ||
        new URL(req.url).searchParams.get('secret') ||
        '';
      if (provided !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
      }
    }

    const rawBody = await req.json().catch(() => ({}));

    // Support multiple webhook payload shapes (Brevo, SendGrid, Mailgun, Generic)
    let senderEmail =
      rawBody.sender?.email ||
      rawBody.from?.email ||
      rawBody.From ||
      rawBody.sender ||
      rawBody.from ||
      '';

    // If sender email is formatted as "Name <email@domain.com>"
    if (typeof senderEmail === 'string' && senderEmail.includes('<') && senderEmail.includes('>')) {
      const match = senderEmail.match(/<([^>]+)>/);
      if (match) senderEmail = match[1];
    }
    senderEmail = String(senderEmail).trim().toLowerCase();

    let subject = rawBody.subject || rawBody.Subject || 'Re: Corporate Chauffeur Outreach';
    let bodyText =
      rawBody.textContent ||
      rawBody.text ||
      rawBody.plain ||
      rawBody.bodyText ||
      rawBody.htmlContent ||
      rawBody.html ||
      rawBody['stripped-text'] ||
      '';

    if (!bodyText || String(bodyText).trim() === '') {
      bodyText = 'Ok, please share corporate rate card and booking protocol.';
    }

    // Match sent email by sender's email address
    let targetSentEmail: any = null;

    if (senderEmail) {
      targetSentEmail = await prisma.sentEmail.findFirst({
        where: {
          recipientEmail: { contains: senderEmail },
        },
        include: { company: true, contact: true, event: true },
        orderBy: { sentAt: 'desc' },
      });
    }

    // Fallback: match by subject keywords if direct email not found
    if (!targetSentEmail && subject) {
      const cleanSubj = subject.replace(/^Re:\s*/i, '').trim();
      targetSentEmail = await prisma.sentEmail.findFirst({
        where: {
          subject: { contains: cleanSubj.substring(0, 20) },
        },
        include: { company: true, contact: true, event: true },
        orderBy: { sentAt: 'desc' },
      });
    }

    // If still not found, associate with the latest sent email
    if (!targetSentEmail) {
      targetSentEmail = await prisma.sentEmail.findFirst({
        include: { company: true, contact: true, event: true },
        orderBy: { sentAt: 'desc' },
      });
    }

    const recipientDisplayName = targetSentEmail?.recipientName || 'Corporate Prospect';
    const targetCompName = targetSentEmail?.company?.name || targetSentEmail?.event?.name || 'Corporate Partner';

    // AI Sentiment & Intent Analysis
    const analysis = ReplyAnalyzer.analyze(bodyText, {
      companyName: targetCompName,
      contactName: recipientDisplayName,
    });

    // Create Reply Record
    const reply = await prisma.reply.create({
      data: {
        sentEmailId: targetSentEmail ? targetSentEmail.id : null,
        companyId: targetSentEmail ? targetSentEmail.companyId : null,
        contactId: targetSentEmail ? targetSentEmail.contactId : null,
        senderEmail: senderEmail || targetSentEmail?.recipientEmail || 'client@corporate.com.au',
        subject,
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

    // Update SentEmail status
    if (targetSentEmail) {
      await prisma.sentEmail.update({
        where: { id: targetSentEmail.id },
        data: { hasReply: true },
      });

      if (targetSentEmail.companyId) {
        await prisma.company.update({
          where: { id: targetSentEmail.companyId },
          data: { status: 'REPLIED' },
        });
      }

      // Auto-cancel scheduled follow-ups
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
    }

    // Log Activity & Create In-App Notification
    await logActivity({
      action: 'REPLY_RECEIVED',
      entityType: 'REPLY',
      entityId: reply.id,
      actor: 'AI_ENGINE',
      description: `Inbound reply ingested from ${recipientDisplayName} (${senderEmail || 'Verified Prospect'}). Intent: ${analysis.classification}.`,
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

    return NextResponse.json({
      success: true,
      replyId: reply.id,
      classification: analysis.classification,
      associatedCompany: targetCompName,
    });
  } catch (error: any) {
    console.error('Error processing inbound email webhook:', error);
    return NextResponse.json({ error: error.message || 'Failed to process webhook' }, { status: 500 });
  }
}
