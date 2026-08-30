import { NextRequest, NextResponse } from 'next/server';
import { ZohoImapSyncEngine } from '@/lib/email/imap-sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await ZohoImapSyncEngine.syncInboundReplies();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error syncing replies:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync inbound replies' },
      { status: 500 }
    );
  }
}
