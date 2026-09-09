/**
 * Google Places (new Places API v1) company discovery.
 *
 * Given a location, returns real local businesses that are likely B2B targets
 * for a premium chauffeur service (corporate offices, professional services,
 * hotels, event venues, etc.), each with a website domain that can then be
 * enriched for contact emails via Hunter/Apollo.
 *
 * Requires GOOGLE_MAPS_API_KEY (Places API enabled). Returns [] if the key is
 * missing or the API fails, so callers can fall back to other sources.
 */

export interface DiscoveredCompany {
  name: string;
  domain: string;
  industry: string;
  suburb: string;
  address: string;
  size: string;
  whyTarget: string;
  targetRoles: string[];
  source: 'GOOGLE_PLACES' | 'APOLLO_LIVE';
}

const B2B_QUERIES = [
  'corporate head offices',
  'law firms',
  'financial services and accounting firms',
  'hotels and conference venues',
];

function toDomain(websiteUri?: string): string {
  if (!websiteUri) return '';
  return websiteUri.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim().toLowerCase();
}

export class GooglePlacesClient {
  /** Quick key check: a real search that should succeed for any valid key. */
  static async verifyKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey.trim(),
          'X-Goog-FieldMask': 'places.displayName',
        },
        body: JSON.stringify({ textQuery: 'cafes in Melbourne', maxResultCount: 1 }),
      });

      if (res.ok) {
        return { success: true, message: 'Google Places API key is valid and connected!' };
      }

      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        message: data.error?.message || `Google Places API returned HTTP ${res.status} — check the key and that "Places API (New)" is enabled with billing active.`,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error verifying Google Places API key' };
    }
  }

  static async searchCompaniesByLocation(
    location: string,
    apiKey: string,
    maxPerQuery: number = 8
  ): Promise<DiscoveredCompany[]> {
    if (!apiKey) return [];
    const key = apiKey.trim();
    const results: DiscoveredCompany[] = [];
    const seenDomains = new Set<string>();

    for (const topic of B2B_QUERIES) {
      try {
        const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask':
              'places.displayName,places.websiteUri,places.formattedAddress,places.primaryTypeDisplayName,places.businessStatus',
          },
          body: JSON.stringify({
            textQuery: `${topic} in ${location}`,
            maxResultCount: maxPerQuery,
          }),
        });

        if (!res.ok) {
          // Auth/quota/API-not-enabled — stop trying further topics.
          break;
        }

        const data = await res.json().catch(() => ({}));
        const places: any[] = data.places || [];

        for (const p of places) {
          if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
          const domain = toDomain(p.websiteUri);
          if (!domain || seenDomains.has(domain)) continue;
          // Skip aggregators/directories that aren't real single companies.
          if (/(google|facebook|linkedin|wikipedia|tripadvisor|yelp)\./.test(domain)) continue;
          seenDomains.add(domain);

          const name = p.displayName?.text || domain;
          const industry = p.primaryTypeDisplayName?.text || 'Business';

          results.push({
            name,
            domain,
            industry,
            suburb: location,
            address: p.formattedAddress || location,
            size: 'Unknown',
            whyTarget: `${industry} in ${location} — potential need for executive transfers, airport pickups, and client/event transport.`,
            targetRoles: ['Executive Assistant', 'Office Manager', 'Head of Operations', 'Events / Front Office Manager'],
            source: 'GOOGLE_PLACES',
          });
        }
      } catch {
        // ignore this topic, continue with the next
      }
    }

    return results;
  }
}
