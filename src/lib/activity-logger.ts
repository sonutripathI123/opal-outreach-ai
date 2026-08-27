import { prisma } from './prisma';

export interface LogParams {
  action:
    | 'DISCOVERY'
    | 'RESEARCH'
    | 'SCORE_GENERATED'
    | 'CONTACT_FOUND'
    | 'DRAFT_GENERATED'
    | 'DRAFT_EDITED'
    | 'DRAFT_APPROVED'
    | 'DRAFT_REJECTED'
    | 'EMAIL_SENT'
    | 'REPLY_RECEIVED'
    | 'FOLLOW_UP_CREATED'
    | 'SETTING_UPDATED'
    | 'JOB_RUN';
  entityType: 'COMPANY' | 'EVENT' | 'CONTACT' | 'DRAFT' | 'SENT_EMAIL' | 'REPLY' | 'SETTING';
  entityId?: string;
  actor?: 'AI_ENGINE' | 'ADMIN_USER' | 'BACKGROUND_SCHEDULER';
  description: string;
  details?: Record<string, any>;
}

export async function logActivity(params: LogParams) {
  try {
    return await prisma.activityLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        actor: params.actor || 'AI_ENGINE',
        description: params.description,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
    return null;
  }
}

export async function createNotification(params: {
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  metadata?: Record<string, any>;
}) {
  try {
    return await prisma.notification.create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        linkUrl: params.linkUrl,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}
