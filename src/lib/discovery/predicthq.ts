/**
 * PredictHQ live event discovery.
 *
 * Unlike company discovery (Apollo/Google Places/OSM), PredictHQ is a
 * real-world-event *intelligence* API — it tells us that a conference, expo,
 * festival, or sporting event genuinely exists at a location on a given date,
 * with a predicted attendance figure. It does NOT provide organiser contact
 * emails; PredictHQ is not a people/company directory.
 *
 * So discovered events come back with empty organiser fields. The caller
 * must either already know who to email, or leave the event as "discovered"
 * for a human to research and add a real contact to before any draft is
 * generated — we never fabricate an organiser address.
 *
 * Requires PREDICTHQ_API_KEY (14-day free trial, no card required as of the
 * PredictHQ docs). Returns [] on missing key, network error, or no matches.
 */

export interface PredictHqEvent {
  id: string;
  name: string;
  eventType: 'CONFERENCE' | 'TRADE_SHOW' | 'GALA_DINNER' | 'SPORTING_EVENT' | 'VIP_GATHERING';
  startDate: string;
  endDate?: string;
  venueName: string;
  venueAddress: string;
  suburb: string;
  city: string;
  state: string;
  expectedAttendance: number;
  vipPresenceLikelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  ticketPriceRange: string;
  whyRelevant: string;
  recommendedServices: string[];
  organizerName: string;
  organizerCompany: string;
  organizerWebsite: string;
  organizerEmail: string;
  sourceUrl: string;
  source: 'PREDICTHQ_LIVE';
}

const USER_AGENT = 'OpalOutreachAI/1.0 (event discovery; contact: book@opalchauffeurs.com.au)';
const RELEVANT_CATEGORIES = 'conferences,expos,festivals,performing-arts,sports,community';

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function geocode(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } }, 8000);
    if (!res.ok) return null;
    const data = await res.json().catch(() => []);
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function mapCategory(category: string): PredictHqEvent['eventType'] {
  switch (category) {
    case 'expos':
      return 'TRADE_SHOW';
    case 'sports':
      return 'SPORTING_EVENT';
    case 'performing-arts':
      return 'GALA_DINNER';
    case 'community':
      return 'VIP_GATHERING';
    case 'conferences':
    default:
      return 'CONFERENCE';
  }
}

export class PredictHqClient {
  static async searchEventsByLocation(
    location: string,
    apiKey: string,
    radiusKm: number = 50,
    limit: number = 50
  ): Promise<PredictHqEvent[]> {
    if (!apiKey) return [];

    const geo = await geocode(location);
    if (!geo) return [];

    const today = new Date().toISOString().split('T')[0];
    const params = new URLSearchParams({
      within: `${radiusKm}km@${geo.lat},${geo.lon}`,
      country: 'AU',
      category: RELEVANT_CATEGORIES,
      // start.gte (not active.gte): active.gte also surfaces multi-day
      // events/passes that started before today but are still "active",
      // which crowded out genuinely upcoming single-day events (e.g. a
      // one-off sports fixture a few days out) once the result limit hit.
      'start.gte': today,
      sort: 'start',
      limit: String(limit),
    });

    let data: any;
    try {
      const res = await fetchWithTimeout(
        `https://api.predicthq.com/v1/events/?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            Accept: 'application/json',
          },
        },
        12000
      );
      if (!res.ok) return [];
      data = await res.json();
    } catch {
      return [];
    }

    const results: any[] = data?.results || [];
    return results
      .map((ev): PredictHqEvent | null => {
        if (!ev.title || !ev.start) return null;

        const attendance = typeof ev.phq_attendance === 'number' ? ev.phq_attendance : undefined;
        const category = Array.isArray(ev.category) ? ev.category[0] : ev.category;
        const eventType = mapCategory(category);
        const vip: PredictHqEvent['vipPresenceLikelihood'] =
          attendance && attendance > 1500 ? 'HIGH' : attendance && attendance > 300 ? 'MEDIUM' : 'LOW';

        return {
          id: `phq-${ev.id}`,
          name: ev.title,
          eventType,
          startDate: ev.start.split('T')[0],
          endDate: ev.end ? ev.end.split('T')[0] : undefined,
          venueName: ev.entities?.find((e: any) => e.type === 'venue')?.name || location,
          venueAddress: location,
          suburb: location,
          city: location,
          state: '',
          expectedAttendance: attendance || 0,
          vipPresenceLikelihood: vip,
          ticketPriceRange: '',
          whyRelevant: `Real event detected via PredictHQ${attendance ? ` — predicted attendance ~${attendance.toLocaleString()}` : ''}. Potential need for attendee/VIP transfers and airport logistics.`,
          recommendedServices: ['Airport Transfers', 'Corporate Event & Conference Transfers'],
          // PredictHQ does not provide organiser contact details — left blank
          // intentionally. A human must research and add the real organiser
          // before this can be drafted and sent.
          organizerName: '',
          organizerCompany: '',
          organizerWebsite: '',
          organizerEmail: '',
          sourceUrl: `https://www.predicthq.com/events/${ev.id}`,
          source: 'PREDICTHQ_LIVE',
        };
      })
      .filter((e): e is PredictHqEvent => e !== null);
  }
}
