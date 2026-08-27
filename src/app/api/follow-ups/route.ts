import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function GET() {
  try {
    const followUps = await prisma.followUp.findMany({
      include: {
        sentEmail: {
          include: {
            company: true,
            contact: true,
          },
        },
        company: true,
        contact: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return NextResponse.json({ followUps });
  } catch (error: any) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { followUpId, action } = body; // action: 'SEND' | 'CANCEL'

    if (!followUpId) {
      return NextResponse.json({ error: 'followUpId is required' }, { status: 400 });
    }

    if (action === 'CANCEL') {
      const updated = await prisma.followUp.update({
        where: { id: followUpId },
        data: {
          status: 'CANCELLED',
          cancelReason: 'MANUAL_STOP',
        },
      });
      return NextResponse.json({ success: true, followUp: updated });
    }

    if (action === 'SEND') {
      const followUp = await prisma.followUp.findUnique({
        where: { id: followUpId },
        include: { sentEmail: true },
      });

      if (!followUp) {
        return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
      }

      const updated = await prisma.followUp.update({
        where: { id: followUpId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      await logActivity({
        action: 'EMAIL_SENT',
        entityType: 'SENT_EMAIL',
        entityId: followUp.sentEmailId,
        actor: 'ADMIN_USER',
        description: `Step ${followUp.stepNumber} follow-up sent to ${followUp.sentEmail.recipientEmail}.`,
      });

      return NextResponse.json({ success: true, followUp: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing follow-up action:', error);
    return NextResponse.json({ error: 'Failed to process follow-up' }, { status: 500 });
  }
}
