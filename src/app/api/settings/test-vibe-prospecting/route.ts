import { NextRequest, NextResponse } from 'next/server';
import { VibeProspectingClient } from '@/lib/enrichment/vibeprospecting';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let { apiKey } = await req.json().catch(() => ({ apiKey: null }));

    if (!apiKey) {
      apiKey = await VibeProspectingClient.getApiKey();
    }

    if (!apiKey || apiKey.trim() === '' || apiKey.includes('••••')) {
      return NextResponse.json(
        { success: false, error: 'No valid Vibe Prospecting (Explorium) API key found. Please provide an active key.' },
        { status: 400 }
      );
    }

    const result = await VibeProspectingClient.testKey(apiKey);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error testing Vibe Prospecting API' },
      { status: 500 }
    );
  }
}
