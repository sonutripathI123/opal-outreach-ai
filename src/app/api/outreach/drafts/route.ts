import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'READY_FOR_REVIEW';

    const whereClause: any = {};
    if (status !== 'ALL') {
      whereClause.status = status;
    }

    const drafts = await prisma.emailDraft.findMany({
      where: whereClause,
      include: {
        company: {
          include: {
            research: true,
            opportunity: true,
          },
        },
        event: {
          include: {
            research: true,
            opportunity: true,
          },
        },
        contact: true,
        sentEmail: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ drafts });
  } catch (error: any) {
    console.error('Error fetching email drafts:', error);
    return NextResponse.json({ error: 'Failed to fetch email drafts' }, { status: 500 });
  }
}
