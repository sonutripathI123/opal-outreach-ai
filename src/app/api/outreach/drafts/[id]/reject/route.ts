import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { rejectionReason = 'NOT_RELEVANT', rejectionFeedbackNotes = '' } = body;

    const draft = await prisma.emailDraft.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason,
        rejectionFeedbackNotes,
      },
      include: { company: true, event: true },
    });

    if (draft.companyId) {
      await prisma.company.update({
        where: { id: draft.companyId },
        data: { status: 'REJECTED' },
      });
    }

    await logActivity({
      action: 'DRAFT_REJECTED',
      entityType: 'DRAFT',
      entityId: id,
      actor: 'ADMIN_USER',
      description: `Draft outreach for ${draft.recipientName} rejected with reason: ${rejectionReason}.`,
      details: { rejectionReason, rejectionFeedbackNotes },
    });

    return NextResponse.json({ success: true, draft });
  } catch (error: any) {
    console.error('Error rejecting draft:', error);
    return NextResponse.json({ error: 'Failed to reject draft' }, { status: 500 });
  }
}
