import { NextResponse } from 'next/server';
import { MELBOURNE_TARGET_COMPANIES } from '@/lib/data/targets';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    totalTargets: MELBOURNE_TARGET_COMPANIES.length,
    companies: MELBOURNE_TARGET_COMPANIES,
    domainsList: MELBOURNE_TARGET_COMPANIES.map((c) => c.domain).join(','),
  });
}
