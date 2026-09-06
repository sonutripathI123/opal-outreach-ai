import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailDispatcher } from '@/lib/email/dispatcher';
import { ZohoImapSyncEngine } from '@/lib/email/imap-sync';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

/**
 * Scheduled worker endpoint.
 *
 * Meant to be hit on a schedule by an external cron (e.g. cron-job.org) so the
 * app doesn't need an always-on background process. It:
 *   1. Syncs inbound replies (Zoho IMAP), which also auto-cancels follow-ups
 *      for prospects who replied.
 *   2. Sends any follow-ups that are now due, through the configured email
 *      provider.
 *
 * Secured by a shared secret (CRON_SECRET) passed as ?secret= or the
 * x-cron-secret header, so it can safely live outside the login gate.
 */
async function runCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server.' },
      { status: 503 }
    );
  }

  const provided =
    req.headers.get('x-cron-secret') ||
    new URL(req.url).searchParams.get('secret') ||
    '';
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result: {
    ranAt: string;
    repliesSynced: number;
    followUpsSent: number;
    followUpsCancelled: number;
    followUpsFailed: number;
    notes: string[];
  } = {
    ranAt: new Date().toISOString(),
    repliesSynced: 0,
    followUpsSent: 0,
    followUpsCancelled: 0,
    followUpsFailed: 0,
    notes: [],
  };

  // 1. Pull inbound replies (best-effort — ignored if IMAP isn't configured).
  try {
    const sync = await ZohoImapSyncEngine.syncInboundReplies();
    if (sync.success) {
      result.repliesSynced = sync.syncedCount;
    } else if (sync.error) {
      result.notes.push(`reply-sync: ${sync.error}`);
    }
  } catch (e: any) {
    result.notes.push(`reply-sync error: ${e?.message || 'unknown'}`);
  }

  // 2. Send follow-ups that are due now.
  const due = await prisma.followUp.findMany({
    where: { status: 'SCHEDULED', scheduledDate: { lte: new Date() } },
    include: { sentEmail: true, contact: true },
    orderBy: { scheduledDate: 'asc' },
    take: 50,
  });

  for (const fu of due) {
    // Stop-rule: don't chase a prospect who already replied.
    if (fu.sentEmail?.hasReply) {
      await prisma.followUp.update({
        where: { id: fu.id },
        data: { status: 'CANCELLED', cancelReason: 'REPLY_RECEIVED' },
      });
      result.followUpsCancelled++;
      continue;
    }

    const to = fu.sentEmail?.recipientEmail || fu.contact?.email;
    const toName = fu.sentEmail?.recipientName || fu.contact?.fullName || undefined;

    if (!to) {
      await prisma.followUp.update({
        where: { id: fu.id },
        data: { status: 'SKIPPED', cancelReason: 'MANUAL_STOP' },
      });
      result.followUpsFailed++;
      continue;
    }

    const dispatch = await EmailDispatcher.sendEmail({
      to,
      toName,
      subject: fu.draftSubject,
      text: fu.draftBody,
      replyTo: 'book@opalchauffeurs.com.au',
    });

    if (dispatch.success) {
      await prisma.followUp.update({
        where: { id: fu.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
      await logActivity({
        action: 'EMAIL_SENT',
        entityType: 'SENT_EMAIL',
        entityId: fu.sentEmailId,
        actor: 'BACKGROUND_SCHEDULER',
        description: `Automated follow-up (step ${fu.stepNumber}) sent to ${to} via ${dispatch.mode}.`,
        details: { messageId: dispatch.messageId, mode: dispatch.mode },
      });
      result.followUpsSent++;
    } else {
      // Leave it SCHEDULED so the next run retries (transient provider errors).
      result.followUpsFailed++;
      result.notes.push(`follow-up ${fu.id}: ${dispatch.error || 'dispatch failed'}`);
    }
  }

  return NextResponse.json({ success: true, ...result });
}

export async function GET(req: NextRequest) {
  return runCron(req);
}

export async function POST(req: NextRequest) {
  return runCron(req);
}
