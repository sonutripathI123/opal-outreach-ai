import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PredictHqClient } from '@/lib/discovery/predicthq';
import type { PredictHqEvent } from '@/lib/discovery/predicthq';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locationQuery = 'South Wharf' } = body;

    const sourcesUsed: string[] = [];

    // Live, location-based event discovery via PredictHQ — works for ANY
    // Australian location. Requires PREDICTHQ_API_KEY; returns [] and is
    // silently skipped without one (or once the free trial has expired).
    // PredictHQ does not supply organiser contact details, so these events
    // come back with blank organiser fields — a human must research and add
    // a real contact before a draft can be generated. We never fabricate a
    // placeholder organiser/event for locations with no live matches.
    let matchedEvents: PredictHqEvent[] = [];
    try {
      const predictHqKey = process.env.PREDICTHQ_API_KEY || '';
      if (predictHqKey) {
        const liveEvents = await PredictHqClient.searchEventsByLocation(locationQuery.trim(), predictHqKey);
        if (liveEvents.length > 0) {
          matchedEvents.push(...liveEvents);
          sourcesUsed.push('PREDICTHQ_LIVE');
        }
      }
    } catch (e) {
      console.warn('PredictHQ live event search failed:', e);
    }

    // De-duplicate by name.
    const seen = new Set<string>();
    matchedEvents = matchedEvents.filter((ev) => {
      const key = ev.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Check which events are already in our database
    const existingEvents = await prisma.event.findMany({
      select: { name: true, slug: true },
    });
    const existingNames = new Set(existingEvents.map((e) => e.name.toLowerCase()));

    const enrichedEvents = matchedEvents.map((ev) => ({
      ...ev,
      isAlreadyImported: existingNames.has(ev.name.toLowerCase()),
    }));

    return NextResponse.json({
      success: true,
      query: locationQuery,
      totalDiscovered: enrichedEvents.length,
      sources: sourcesUsed,
      events: enrichedEvents,
    });
  } catch (error: any) {
    console.error('Error scanning location for events:', error);
    return NextResponse.json({ error: 'Failed to scan location for events' }, { status: 500 });
  }
}
