import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';

export async function GET() {
  try {
    const locations = await prisma.serviceLocation.findMany({
      include: {
        suburbs: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { cityName: 'asc' }],
    });

    return NextResponse.json({ locations });
  } catch (error: any) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Action: Add Suburb
    if (action === 'ADD_SUBURB') {
      const { locationId, name, postcode, commercialHubType = 'BUSINESS_DISTRICT' } = body;
      if (!locationId || !name || !postcode) {
        return NextResponse.json({ error: 'locationId, name, and postcode are required' }, { status: 400 });
      }

      const suburb = await prisma.suburb.create({
        data: {
          locationId,
          name,
          postcode,
          commercialHubType,
          isPriority: true,
          isActive: true,
        },
      });

      await logActivity({
        action: 'SETTING_UPDATED',
        entityType: 'SETTING',
        actor: 'ADMIN_USER',
        description: `Added new active suburb ${name} (${postcode}) to service locations.`,
      });

      return NextResponse.json({ success: true, suburb }, { status: 201 });
    }

    // Action: Add Location (City)
    const { cityName, state, country = 'Australia', serviceRadiusKm = 50, priorityLevel = 'HIGH', notes } = body;
    if (!cityName || !state) {
      return NextResponse.json({ error: 'cityName and state are required' }, { status: 400 });
    }

    const location = await prisma.serviceLocation.create({
      data: {
        cityName,
        state,
        country,
        serviceRadiusKm: parseInt(serviceRadiusKm.toString()),
        priorityLevel,
        notes,
        isPrimary: false,
        isActive: true,
      },
    });

    await logActivity({
      action: 'SETTING_UPDATED',
      entityType: 'SETTING',
      actor: 'ADMIN_USER',
      description: `Activated new service location: ${cityName}, ${state}.`,
    });

    return NextResponse.json({ success: true, location }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating location/suburb:', error);
    return NextResponse.json({ error: 'Failed to save location' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { locationId, suburbId, isActive, priorityLevel, serviceRadiusKm } = body;

    if (suburbId) {
      const updated = await prisma.suburb.update({
        where: { id: suburbId },
        data: {
          ...(isActive !== undefined && { isActive }),
        },
      });
      return NextResponse.json({ success: true, suburb: updated });
    }

    if (locationId) {
      const updated = await prisma.serviceLocation.update({
        where: { id: locationId },
        data: {
          ...(isActive !== undefined && { isActive }),
          ...(priorityLevel && { priorityLevel }),
          ...(serviceRadiusKm && { serviceRadiusKm: parseInt(serviceRadiusKm.toString()) }),
        },
      });
      return NextResponse.json({ success: true, location: updated });
    }

    return NextResponse.json({ error: 'locationId or suburbId required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating location:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
