import { prisma } from '@/lib/prisma';
import { EmailDispatcher } from '@/lib/email/dispatcher';
import { logActivity } from '@/lib/activity-logger';

export interface FollowUpRunResult {
  dueCount: number;
  sent: number;
  cancelled: number;
  failed: number;
  notes: string[];
}

/**
 * Sends every follow-up whose scheduled date has passed, honouring the
 * reply stop-rule (never chase a prospect who already replied). Shared by
 * the cron worker (/api/cron/run) and the manual "Run Now" job trigger so
 * both paths do the same real work.
 */
export async function processDueFollowUps(
  actor: 'BACKGROUND_SCHEDULER' | 'ADMIN_USER' = 'BACKGROUND_SCHEDULER'
): Promise<FollowUpRunResult> {
  const due = await prisma.followUp.findMany({
    where: { status: 'SCHEDULED', scheduledDate: { lte: new Date() } },
    include: { sentEmail: true, contact: true },
    orderBy: { scheduledDate: 'asc' },
    take: 50,
  });

  const result: FollowUpRunResult = { dueCount: due.length, sent: 0, cancelled: 0, failed: 0, notes: [] };

  for (const fu of due) {
    if (fu.sentEmail?.hasReply) {
      await prisma.followUp.update({
        where: { id: fu.id },
        data: { status: 'CANCELLED', cancelReason: 'REPLY_RECEIVED' },
      });
      result.cancelled++;
      continue;
    }

    const to = fu.sentEmail?.recipientEmail || fu.contact?.email;
    const toName = fu.sentEmail?.recipientName || fu.contact?.fullName || undefined;

    if (!to) {
      await prisma.followUp.update({
        where: { id: fu.id },
        data: { status: 'SKIPPED', cancelReason: 'MANUAL_STOP' },
      });
      result.failed++;
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
        actor,
        description: `Follow-up (step ${fu.stepNumber}) sent to ${to} via ${dispatch.mode}.`,
        details: { messageId: dispatch.messageId, mode: dispatch.mode },
      });
      result.sent++;
    } else {
      // Leave it SCHEDULED so the next run retries transient provider errors.
      result.failed++;
      result.notes.push(`follow-up ${fu.id}: ${dispatch.error || 'dispatch failed'}`);
    }
  }

  return result;
}
