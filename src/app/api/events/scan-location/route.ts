import { NextRequest, NextResponse } from 'next/server';
import { KNOWN_LOCATION_EVENTS, DiscoveredEventItem } from '@/lib/data/events-catalog';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locationQuery = 'South Wharf' } = body;
    const cleanQuery = locationQuery.trim().toLowerCase();

    // 1. Check known catalog for matches
    let matchedEvents: DiscoveredEventItem[] = [];

    for (const [locKey, events] of Object.entries(KNOWN_LOCATION_EVENTS)) {
      if (cleanQuery.includes(locKey) || locKey.includes(cleanQuery)) {
        matchedEvents.push(...events);
      }
    }

    // Also match inside event venues, suburbs or names
    if (matchedEvents.length === 0) {
      for (const events of Object.values(KNOWN_LOCATION_EVENTS)) {
        for (const ev of events) {
          if (
            ev.venueName.toLowerCase().includes(cleanQuery) ||
            ev.suburb.toLowerCase().includes(cleanQuery) ||
            ev.city.toLowerCase().includes(cleanQuery) ||
            ev.name.toLowerCase().includes(cleanQuery)
          ) {
            if (!matchedEvents.some((m) => m.id === ev.id)) {
              matchedEvents.push(ev);
            }
          }
        }
      }
    }

    // Note: we intentionally do NOT fabricate placeholder events with made-up
    // organiser names/emails for unknown locations — sending to invented
    // addresses causes bounces and harms sender reputation. Unknown locations
    // simply return no events from the curated catalog.

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
      events: enrichedEvents,
    });
  } catch (error: any) {
    console.error('Error scanning location for events:', error);
    return NextResponse.json({ error: 'Failed to scan location for events' }, { status: 500 });
  }
}
