import { NextRequest, NextResponse } from 'next/server';
import { HunterClient } from '@/lib/enrichment/hunter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Hunter.io API Key is required' }, { status: 400 });
    }

    const result = await HunterClient.verifyKey(apiKey);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error verifying Hunter API key' },
      { status: 500 }
    );
  }
}
