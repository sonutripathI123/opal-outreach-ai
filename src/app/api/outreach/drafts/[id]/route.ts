import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const draft = await prisma.emailDraft.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            research: true,
            opportunity: true,
            contacts: true,
          },
        },
        event: {
          include: {
            research: true,
            opportunity: true,
            contacts: true,
          },
        },
        contact: true,
        sentEmail: true,
      },
    });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({ draft });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { subject, fullBodyText, recipientEmail, recipientName, recipientRole } = body;

    const updated = await prisma.emailDraft.update({
      where: { id },
      data: {
        ...(subject && { subject }),
        ...(fullBodyText && { fullBodyText }),
        ...(recipientEmail && { recipientEmail }),
        ...(recipientName && { recipientName }),
        ...(recipientRole && { recipientRole }),
      },
    });

    await logActivity({
      action: 'DRAFT_EDITED',
      entityType: 'DRAFT',
      entityId: id,
      actor: 'ADMIN_USER',
      description: `Administrator edited outreach email draft for ${updated.recipientName} (${updated.recipientEmail}).`,
    });

    return NextResponse.json({ success: true, draft: updated });
  } catch (error: any) {
    console.error('Error updating draft:', error);
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
}
