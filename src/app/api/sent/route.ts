import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sentEmails = await prisma.sentEmail.findMany({
      include: {
        company: true,
        event: true,
        contact: true,
        draft: true,
        replies: true,
        followUps: true,
      },
      orderBy: { sentAt: 'desc' },
    });

    return NextResponse.json({ sentEmails });
  } catch (error: any) {
    console.error('Error fetching sent emails:', error);
    return NextResponse.json({ error: 'Failed to fetch sent emails' }, { status: 500 });
  }
}
