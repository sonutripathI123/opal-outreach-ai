import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ services });
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, shortDescription, fullDescription, features, targetAudience, pricingModel, suggestedKeywords } = body;

    if (!name || !category || !shortDescription) {
      return NextResponse.json({ error: 'Name, category, and shortDescription are required' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const service = await prisma.service.create({
      data: {
        name,
        slug: `${slug}-${Date.now().toString().slice(-3)}`,
        category,
        shortDescription,
        fullDescription: fullDescription || shortDescription,
        features: typeof features === 'string' ? features : JSON.stringify(features || []),
        targetAudience: targetAudience || 'Corporate Executives & Event Organizers',
        pricingModel,
        suggestedKeywords,
      },
    });

    await logActivity({
      action: 'SETTING_UPDATED',
      entityType: 'SETTING',
      actor: 'ADMIN_USER',
      description: `Added new Opal service line: ${name}.`,
    });

    return NextResponse.json({ success: true, service }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, shortDescription, fullDescription, features, pricingModel, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Service id is required' }, { status: 400 });
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(shortDescription && { shortDescription }),
        ...(fullDescription && { fullDescription }),
        ...(features !== undefined && { features: typeof features === 'string' ? features : JSON.stringify(features) }),
        ...(pricingModel !== undefined && { pricingModel }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    await logActivity({
      action: 'SETTING_UPDATED',
      entityType: 'SETTING',
      actor: 'ADMIN_USER',
      description: `Updated Opal service: ${updated.name}.`,
    });

    return NextResponse.json({ success: true, service: updated });
  } catch (error: any) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}
