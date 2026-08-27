import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        research: true,
        opportunity: true,
        contacts: true,
        emailDrafts: {
          orderBy: { createdAt: 'desc' },
        },
        sentEmails: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const activities = await prisma.activityLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ event, activities });
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, priority } = body;

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
      },
    });

    await logActivity({
      action: 'SETTING_UPDATED',
      entityType: 'EVENT',
      entityId: id,
      actor: 'ADMIN_USER',
      description: `Updated status for event ${updated.name} to ${status || updated.status}.`,
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
