import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let profile = await prisma.businessProfile.findFirst();
    if (!profile) {
      profile = await prisma.businessProfile.create({
        data: {
          companyName: 'Opal Chauffeurs',
          tradingName: 'Esteem Travel Service Pty Ltd',
          website: 'https://www.opalchauffeurs.com.au/',
          description:
            'Opal Chauffeurs (Esteem Travel Service Pty Ltd) is a premier private chauffeur transportation service based in Melbourne, Australia.',
          phone: '+61 400 000 000',
          email: 'bookings@opalchauffeurs.com.au',
          address: '18 Crawford Road',
          suburb: 'Clarinda',
          state: 'VIC',
          postcode: '3169',
          country: 'Australia',
          brandPositioning:
            'Melbourne’s premier executive transport partner. Punctual, discreet, 24/7 reliability.',
          emailSignature: `Warm regards,\nCorporate Partnerships Team\nOpal Chauffeurs\nWeb: https://www.opalchauffeurs.com.au/`,
          collaborationOffer:
            'Introducing Opal Chauffeurs as your corporate transport partner.',
        },
      });
    }
    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Error fetching business profile:', error);
    return NextResponse.json({ error: 'Failed to fetch business profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const existing = await prisma.businessProfile.findFirst();

    let updated;
    if (existing) {
      updated = await prisma.businessProfile.update({
        where: { id: existing.id },
        data: {
          companyName: body.companyName ?? existing.companyName,
          tradingName: body.tradingName ?? existing.tradingName,
          website: body.website ?? existing.website,
          description: body.description ?? existing.description,
          phone: body.phone ?? existing.phone,
          email: body.email ?? existing.email,
          address: body.address ?? existing.address,
          suburb: body.suburb ?? existing.suburb,
          state: body.state ?? existing.state,
          postcode: body.postcode ?? existing.postcode,
          country: body.country ?? existing.country,
          brandPositioning: body.brandPositioning ?? existing.brandPositioning,
          emailSignature: body.emailSignature ?? existing.emailSignature,
          collaborationOffer: body.collaborationOffer ?? existing.collaborationOffer,
          customNotes: body.customNotes ?? existing.customNotes,
        },
      });
    } else {
      updated = await prisma.businessProfile.create({ data: body });
    }

    await logActivity({
      action: 'SETTING_UPDATED',
      entityType: 'SETTING',
      actor: 'ADMIN_USER',
      description: 'Updated Opal Chauffeurs Business Profile and brand settings.',
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
