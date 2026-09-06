/**
 * OpenStreetMap company discovery — completely free, no API key, no billing.
 *
 * Flow: geocode the location with Nominatim, then query Overpass for nearby
 * business/office/hospitality features that are plausible B2B chauffeur
 * targets. Websites in OSM are patchy, so results with a website (usable for
 * email enrichment) are returned first.
 *
 * Public OSM services have fair-use limits; this is fine for occasional
 * user-triggered scans. A descriptive User-Agent is required by policy.
 */

export interface OsmCompany {
  name: string;
  domain: string;
  industry: string;
  suburb: string;
  address: string;
  size: string;
  whyTarget: string;
  targetRoles: string[];
  source: 'OPENSTREETMAP';
}

const USER_AGENT = 'OpalOutreachAI/1.0 (corporate target discovery; contact: book@opalchauffeurs.com.au)';

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function toDomain(url?: string): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim().toLowerCase();
}

function labelFromTags(tags: Record<string, string>): string {
  const raw = tags.office || tags.tourism || tags.amenity || tags.shop || tags.company || 'Business';
  return String(raw).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function addressFromTags(tags: Record<string, string>, fallback: string): string {
  const parts = [
    tags['addr:housenumber'] && tags['addr:street']
      ? `${tags['addr:housenumber']} ${tags['addr:street']}`
      : tags['addr:street'],
    tags['addr:suburb'] || tags['addr:city'],
    tags['addr:postcode'],
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : fallback;
}

export class OpenStreetMapClient {
  private static async geocode(location: string): Promise<{ lat: number; lon: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        location
      )}&format=json&limit=1`;
      const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } }, 8000);
      if (!res.ok) return null;
      const data = await res.json().catch(() => []);
      if (!Array.isArray(data) || data.length === 0) return null;
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch {
      return null;
    }
  }

  static async searchCompaniesByLocation(
    location: string,
    radiusMeters: number = 6000,
    limit: number = 25
  ): Promise<OsmCompany[]> {
    const geo = await this.geocode(location);
    if (!geo) return [];

    // Offices, corporate-relevant amenities and hospitality venues nearby.
    const query = `[out:json][timeout:25];
(
  node["office"](around:${radiusMeters},${geo.lat},${geo.lon});
  way["office"](around:${radiusMeters},${geo.lat},${geo.lon});
  node["tourism"="hotel"](around:${radiusMeters},${geo.lat},${geo.lon});
  way["tourism"="hotel"](around:${radiusMeters},${geo.lat},${geo.lon});
  node["amenity"="conference_centre"](around:${radiusMeters},${geo.lat},${geo.lon});
  way["amenity"="conference_centre"](around:${radiusMeters},${geo.lat},${geo.lon});
);
out tags 200;`;

    let elements: any[] = [];
    try {
      const res = await fetchWithTimeout('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
      }, 22000);
      if (!res.ok) return [];
      const data = await res.json().catch(() => ({}));
      elements = data.elements || [];
    } catch {
      return [];
    }

    const seen = new Set<string>();
    const withSite: OsmCompany[] = [];
    const withoutSite: OsmCompany[] = [];

    for (const el of elements) {
      const tags: Record<string, string> = el.tags || {};
      const name = tags.name || tags['official_name'] || tags['brand'];
      if (!name) continue;

      const key = name.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      const domain = toDomain(tags.website || tags['contact:website'] || tags.url);
      if (/(google|facebook|linkedin|wikipedia|tripadvisor|yelp)\./.test(domain)) continue;

      const industry = labelFromTags(tags);
      const company: OsmCompany = {
        name,
        domain,
        industry,
        suburb: location,
        address: addressFromTags(tags, location),
        size: 'Medium (50-200)',
        whyTarget: `${industry} in ${location} — potential executive transfer, airport pickup and client/event transport needs.`,
        targetRoles: ['Executive Assistant', 'Office Manager', 'Head of Operations', 'Front Office / Events Manager'],
        source: 'OPENSTREETMAP',
      };

      (domain ? withSite : withoutSite).push(company);
    }

    // Prefer entries with a website (usable for email enrichment).
    return [...withSite, ...withoutSite].slice(0, limit);
  }
}
