import { prisma } from '@/lib/prisma';

export interface ApolloKeyEntry {
  id: string;
  name: string;
  apiKey: string;
  monthlyLimit?: number;
  creditsUsed: number;
  status: 'ACTIVE' | 'LIMIT_REACHED' | 'INVALID' | 'PAUSED';
  lastUsedAt?: string;
  lastError?: string;
}

export interface ApolloContactResult {
  fullName: string;
  firstName?: string;
  lastName?: string;
  jobTitle: string;
  department?: string;
  email: string;
  emailConfidence: number;
  verificationStatus: string;
  linkedinUrl?: string;
  phone?: string;
  apolloKeyUsedName?: string;
}

export interface ApolloCompanyResult {
  name: string;
  domain: string;
  industry: string;
  suburb: string;
  address: string;
  size: string;
  whyTarget: string;
  targetRoles: string[];
  source: 'APOLLO_LIVE';
}

export class ApolloPoolManager {
  /**
   * Fetch all Apollo API Keys from database
   */
  static async getPool(): Promise<ApolloKeyEntry[]> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: 'apollo_api_key_pool' },
      });
      if (setting?.value) {
        return JSON.parse(setting.value);
      }
    } catch (e) {
      console.error('Error fetching Apollo Key Pool:', e);
    }
    return [];
  }

  /**
   * Save updated pool back to database
   */
  static async savePool(pool: ApolloKeyEntry[]) {
    await prisma.systemSettings.upsert({
      where: { key: 'apollo_api_key_pool' },
      update: {
        value: JSON.stringify(pool),
        category: 'AI_CONFIG',
        description: 'Multi-account Apollo.io API Key Pool with Auto-Failover',
      },
      create: {
        key: 'apollo_api_key_pool',
        value: JSON.stringify(pool),
        category: 'AI_CONFIG',
        description: 'Multi-account Apollo.io API Key Pool with Auto-Failover',
      },
    });
  }

  /**
   * Test a single Apollo API Key
   */
  static async testKey(apiKey: string): Promise<{ success: boolean; message: string; accountInfo?: any }> {
    try {
      const res = await fetch('https://api.apollo.io/v1/auth/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': apiKey.trim(),
        },
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: true, message: 'Apollo API Key is valid and connected!', accountInfo: data };
      } else {
        const errData = await res.json().catch(() => ({}));
        return { success: false, message: errData.message || `Apollo returned error code ${res.status}` };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error connecting to Apollo.io' };
    }
  }

  /**
   * Smart Search for Melbourne Corporate Decision Maker with Auto-Failover
   */
  static async findDecisionMaker(domain: string, companyName: string): Promise<ApolloContactResult | null> {
    const pool = await this.getPool();
    const activeKeys = pool.filter((k) => k.status === 'ACTIVE' && k.apiKey?.trim() !== '');

    if (activeKeys.length === 0) {
      console.warn('No active Apollo API keys found in pool. Generating synthetic contact fallback.');
      return null;
    }

    const targetTitles = [
      'Head of Corporate Travel',
      'Corporate Travel Manager',
      'Travel Coordinator',
      'Director of Operations',
      'Head of Operations',
      'Executive Assistant',
      'EA to CEO',
      'Office Manager',
      'Facilities Director',
      'Chief of Staff',
    ];

    // Try keys sequentially until one succeeds
    for (const keyEntry of activeKeys) {
      try {
        console.log(`🔍 Querying Apollo.io using key [${keyEntry.name}] for domain: ${domain}...`);

        const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': keyEntry.apiKey.trim(),
          },
          body: JSON.stringify({
            q_organization_domains: domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0],
            person_titles: targetTitles,
            page: 1,
            per_page: 5,
          }),
        });

        // Check if rate limited or limit reached
        if (res.status === 429 || res.status === 402 || res.status === 403) {
          console.warn(`⚠️ Apollo Key [${keyEntry.name}] exceeded limit (Status ${res.status}). Auto-switching to next key...`);
          keyEntry.status = 'LIMIT_REACHED';
          keyEntry.lastError = `Limit reached or HTTP ${res.status}`;
          await this.savePool(pool);
          continue; // Auto-switch to next key!
        }

        if (res.ok) {
          const data = await res.json();
          const people = data.people || [];

          // Only ever return a person Apollo actually gave us a real email
          // for — never fabricate a "contact@domain.com" guess, which would
          // bounce and damage sender reputation.
          const person = people.find((p: any) => p.email && p.email_status === 'verified') || people.find((p: any) => p.email);

          if (person?.email) {
            // Update credit usage
            keyEntry.creditsUsed = (keyEntry.creditsUsed || 0) + 1;
            keyEntry.lastUsedAt = new Date().toISOString();
            await this.savePool(pool);

            return {
              fullName: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
              firstName: person.first_name,
              lastName: person.last_name,
              jobTitle: person.title || 'Corporate Operations & Travel Contact',
              department: person.departments?.[0] || 'Operations',
              email: person.email,
              emailConfidence: person.email_status === 'verified' ? 0.95 : 0.82,
              verificationStatus: person.email_status === 'verified' ? 'VERIFIED' : 'LIKELY',
              linkedinUrl: person.linkedin_url || '',
              phone: person.phone_numbers?.[0]?.sanitized_number || '',
              apolloKeyUsedName: keyEntry.name,
            };
          }
        }
      } catch (err: any) {
        console.error(`Error querying Apollo with key [${keyEntry.name}]:`, err.message);
        keyEntry.lastError = err.message;
      }
    }

    return null;
  }

  /**
   * Live company discovery by location via Apollo's organization search.
   * Returns [] when no active key, the plan blocks search, or nothing matches —
   * callers fall back to their own static list in that case.
   */
  static async searchCompaniesByLocation(
    location: string,
    perPage: number = 15
  ): Promise<ApolloCompanyResult[]> {
    const pool = await this.getPool();
    const activeKeys = pool.filter((k) => k.status === 'ACTIVE' && k.apiKey?.trim() !== '');
    if (activeKeys.length === 0) return [];

    const cleanLocation = location.trim();

    for (const keyEntry of activeKeys) {
      try {
        const res = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': keyEntry.apiKey.trim(),
          },
          body: JSON.stringify({
            organization_locations: [cleanLocation],
            page: 1,
            per_page: perPage,
          }),
        });

        if (res.status === 429 || res.status === 402 || res.status === 403) {
          keyEntry.status = 'LIMIT_REACHED';
          keyEntry.lastError = `Company search blocked (HTTP ${res.status})`;
          await this.savePool(pool);
          continue; // try next key
        }

        if (!res.ok) {
          keyEntry.lastError = `Company search HTTP ${res.status}`;
          continue;
        }

        const data = await res.json().catch(() => ({}));
        const orgs: any[] = data.organizations || data.accounts || [];
        if (orgs.length === 0) return [];

        keyEntry.lastUsedAt = new Date().toISOString();
        await this.savePool(pool);

        return orgs
          .map((o) => this.mapOrganization(o, cleanLocation))
          .filter((c): c is ApolloCompanyResult => c !== null);
      } catch (err: any) {
        keyEntry.lastError = err?.message || 'Company search error';
      }
    }

    return [];
  }

  private static mapOrganization(o: any, queriedLocation: string): ApolloCompanyResult | null {
    const name = o.name;
    const domain = (o.primary_domain || o.website_url || '')
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
    if (!name || !domain) return null;

    const employees = Number(o.estimated_num_employees) || 0;
    let size = 'Unknown';
    if (employees >= 1000) size = 'Enterprise (1000+)';
    else if (employees >= 200) size = 'Large (200-1000)';
    else if (employees >= 50) size = 'Medium (50-200)';
    else if (employees > 0) size = 'Small (1-50)';

    const city = o.city || queriedLocation;
    const state = o.state || 'VIC';
    const industry = o.industry || 'Corporate & Professional Services';

    return {
      name,
      domain,
      industry,
      suburb: city,
      address: o.raw_address || [o.street_address, city, state].filter(Boolean).join(', ') || `${city}`,
      size,
      whyTarget: `${industry} organisation in ${city}${employees ? ` (~${employees.toLocaleString()} staff)` : ''}. Likely executive travel, airport transfers and client hosting needs.`,
      targetRoles: ['Executive Assistant', 'Head of Corporate Travel', 'Office Manager', 'Director of Operations'],
      source: 'APOLLO_LIVE',
    };
  }
}
