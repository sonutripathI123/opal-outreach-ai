import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      totalCompanies,
      highPriorityCompanies,
      qualifiedCompanies,
      totalEvents,
      highPriorityEvents,
      totalContacts,
      totalDrafts,
      pendingDrafts,
      sentEmails,
      repliesReceived,
      interestedReplies,
      followUpsDue,
      recentActivities,
      recentReplies,
      pendingApprovalDrafts,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { priority: 'HIGH' } }),
      prisma.company.count({ where: { opportunityScore: { gte: 70 } } }),
      prisma.event.count(),
      prisma.event.count({ where: { priority: 'HIGH' } }),
      prisma.contact.count(),
      prisma.emailDraft.count(),
      prisma.emailDraft.count({ where: { status: 'READY_FOR_REVIEW' } }),
      prisma.sentEmail.count(),
      prisma.reply.count(),
      prisma.reply.count({ where: { aiClassification: { in: ['INTERESTED', 'MEETING_REQUEST', 'PRICING_REQUESTED'] } } }),
      prisma.followUp.count({ where: { status: 'SCHEDULED' } }),
      prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.reply.findMany({
        include: { sentEmail: true, company: true, contact: true },
        orderBy: { receivedAt: 'desc' },
        take: 4,
      }),
      prisma.emailDraft.findMany({
        where: { status: 'READY_FOR_REVIEW' },
        include: {
          company: { include: { opportunity: true } },
          event: { include: { opportunity: true } },
          contact: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalCompanies,
        highPriorityCompanies,
        qualifiedCompanies,
        totalEvents,
        highPriorityEvents,
        totalContacts,
        totalDrafts,
        pendingDrafts,
        sentEmails,
        repliesReceived,
        interestedReplies,
        followUpsDue,
      },
      recentActivities,
      recentReplies,
      pendingApprovalDrafts,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
