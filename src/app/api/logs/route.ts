import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');

    const whereClause: any = {};
    if (action && action !== 'ALL') whereClause.action = action;
    if (entityType && entityType !== 'ALL') whereClause.entityType = entityType;

    const logs = await prisma.activityLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
