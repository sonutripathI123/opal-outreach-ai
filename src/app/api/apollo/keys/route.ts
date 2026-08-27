import { NextRequest, NextResponse } from 'next/server';
import { ApolloPoolManager, ApolloKeyEntry } from '@/lib/enrichment/apollo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = await ApolloPoolManager.getPool();
    // Return pool with safely masked keys
    const safePool = pool.map((k) => ({
      ...k,
      maskedKey: k.apiKey ? `${k.apiKey.substring(0, 6)}••••••••${k.apiKey.slice(-4)}` : '',
    }));
    return NextResponse.json({ pool: safePool, totalKeys: pool.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, keyEntry, pool } = body;

    let currentPool = await ApolloPoolManager.getPool();

    if (action === 'SET_POOL' && Array.isArray(pool)) {
      currentPool = pool;
    } else if (action === 'ADD_KEY' && keyEntry) {
      const newEntry: ApolloKeyEntry = {
        id: `apollo-key-${Date.now()}`,
        name: keyEntry.name || `Apollo Account ${currentPool.length + 1}`,
        apiKey: keyEntry.apiKey.trim(),
        monthlyLimit: keyEntry.monthlyLimit || 250,
        creditsUsed: 0,
        status: 'ACTIVE',
      };
      currentPool.push(newEntry);
    } else if (action === 'DELETE_KEY' && body.id) {
      currentPool = currentPool.filter((k) => k.id !== body.id);
    } else if (action === 'RESET_STATUS' && body.id) {
      const target = currentPool.find((k) => k.id === body.id);
      if (target) {
        target.status = 'ACTIVE';
        target.creditsUsed = 0;
        target.lastError = undefined;
      }
    } else if (action === 'TEST_KEY' && body.apiKey) {
      const testRes = await ApolloPoolManager.testKey(body.apiKey);
      return NextResponse.json(testRes);
    }

    await ApolloPoolManager.savePool(currentPool);

    return NextResponse.json({ success: true, pool: currentPool });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
