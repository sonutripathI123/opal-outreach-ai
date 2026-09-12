import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const company = await prisma.company.findUnique({
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
        replies: {
          orderBy: { receivedAt: 'desc' },
        },
        followUps: {
          orderBy: { scheduledDate: 'asc' },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Fetch related activity logs
    const activities = await prisma.activityLog.findMany({
      where: {
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ company, activities });
  } catch (error: any) {
    console.error('Error fetching company details:', error);
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, priority, notes } = body;

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
      },
    });

    await logActivity({
      action: 'SETTING_UPDATED',
      entityType: 'COMPANY',
      entityId: id,
      actor: 'ADMIN_USER',
      description: `Updated status for ${updated.name} to ${status || updated.status}.`,
    });

    return NextResponse.json({ success: true, company: updated });
  } catch (error: any) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Delete dependents explicitly, in dependency order, instead of relying on
    // the database's own ON DELETE CASCADE — a FollowUp/Reply can reference a
    // SentEmail that belongs to this company without the FK cascade chain
    // reliably clearing it first, which previously surfaced as
    // "Foreign key constraint violated: FollowUp_sentEmailId_fkey".
    await prisma.$transaction([
      prisma.followUp.deleteMany({ where: { OR: [{ companyId: id }, { sentEmail: { companyId: id } }] } }),
      prisma.reply.deleteMany({ where: { OR: [{ companyId: id }, { sentEmail: { companyId: id } }] } }),
      prisma.sentEmail.deleteMany({ where: { companyId: id } }),
      prisma.emailDraft.deleteMany({ where: { companyId: id } }),
      prisma.contact.deleteMany({ where: { companyId: id } }),
      prisma.companyResearch.deleteMany({ where: { companyId: id } }),
      prisma.companyOpportunity.deleteMany({ where: { companyId: id } }),
      prisma.company.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
