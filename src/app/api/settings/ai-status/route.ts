import { NextResponse } from 'next/server';
import { AIClient } from '@/lib/ai/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = await AIClient.getApiKey();
  return NextResponse.json({ active: Boolean(apiKey) });
}
