import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findMany();
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value, category, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
    }

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: {
        value: valueStr,
        ...(description && { description }),
      },
      create: {
        category: category || 'SCORING_WEIGHTS',
        key,
        value: valueStr,
        description,
      },
    });

    await logActivity({
      action: 'SETTING_UPDATED',
      entityType: 'SETTING',
      actor: 'ADMIN_USER',
      description: `Updated system setting: ${key}.`,
    });

    return NextResponse.json({ success: true, setting });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
