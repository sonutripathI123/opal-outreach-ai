import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const user = await getCurrentUser();
    const approvedBy = user?.name || 'Administrator';

    const draft = await prisma.emailDraft.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy,
      },
      include: { company: true, event: true },
    });

    if (draft.companyId) {
      await prisma.company.update({
        where: { id: draft.companyId },
        data: { status: 'APPROVED' },
      });
    }

    if (draft.eventId) {
      await prisma.event.update({
        where: { id: draft.eventId },
        data: { status: 'APPROVED' },
      });
    }

    await logActivity({
      action: 'DRAFT_APPROVED',
      entityType: 'DRAFT',
      entityId: id,
      actor: 'ADMIN_USER',
      description: `Outreach email draft for ${draft.recipientName} (${draft.recipientEmail}) approved by ${approvedBy}. Ready for dispatch.`,
      details: { recipientEmail: draft.recipientEmail, approvedBy },
    });

    return NextResponse.json({ success: true, draft });
  } catch (error: any) {
    console.error('Error approving draft:', error);
    return NextResponse.json({ error: 'Failed to approve draft' }, { status: 500 });
  }
}
