import { NextRequest, NextResponse } from 'next/server';
import { ZohoImapSyncEngine } from '@/lib/email/imap-sync';
import { processDueFollowUps } from '@/lib/jobs/follow-ups';

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

  const notes: string[] = [];
  let repliesSynced = 0;

  // 1. Pull inbound replies (best-effort — ignored if IMAP isn't configured).
  try {
    const sync = await ZohoImapSyncEngine.syncInboundReplies();
    if (sync.success) {
      repliesSynced = sync.syncedCount;
    } else if (sync.error) {
      notes.push(`reply-sync: ${sync.error}`);
    }
  } catch (e: any) {
    notes.push(`reply-sync error: ${e?.message || 'unknown'}`);
  }

  // 2. Send follow-ups that are due now.
  const followUpResult = await processDueFollowUps('BACKGROUND_SCHEDULER');
  notes.push(...followUpResult.notes);

  return NextResponse.json({
    success: true,
    ranAt: new Date().toISOString(),
    repliesSynced,
    followUpsSent: followUpResult.sent,
    followUpsCancelled: followUpResult.cancelled,
    followUpsFailed: followUpResult.failed,
    notes,
  });
}

export async function GET(req: NextRequest) {
  return runCron(req);
}

export async function POST(req: NextRequest) {
  return runCron(req);
}
