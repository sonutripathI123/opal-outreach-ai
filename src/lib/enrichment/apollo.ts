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

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

    // Try keys sequentially until one succeeds
    for (const keyEntry of activeKeys) {
      try {
        console.log(`🔍 Querying Apollo.io using key [${keyEntry.name}] for domain: ${domain}...`);

        // A company's public/corporate website domain (e.g.
        // "suncorpgroup.com.au") often isn't the domain its staff's real
        // email addresses use (e.g. "suncorp.com.au") — Apollo itself shows
        // verified contacts for the company under its actual email domain
        // even when a pure q_organization_domains search on the corporate
        // site's domain returns zero people. Resolving the Apollo
        // organization by company NAME first and searching people by its
        // organization_id sidesteps that mismatch entirely.
        let orgId: string | null = null;
        try {
          const orgRes = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': keyEntry.apiKey.trim(),
            },
            body: JSON.stringify({ q_organization_name: companyName, page: 1, per_page: 1 }),
          });
          if (orgRes.ok) {
            const orgData = await orgRes.json().catch(() => ({}));
            const org = (orgData.organizations || orgData.accounts || [])[0];
            if (org?.id) orgId = org.id;
          }
        } catch (err: any) {
          console.warn(`Apollo organization lookup by name failed for [${keyEntry.name}]:`, err.message);
        }

        // Prefer the resolved organization_id (immune to domain-naming
        // mismatches); fall back to the raw domain if name lookup found
        // nothing, since domain search still works fine for most companies.
        const searchBody: Record<string, any> = {
          person_titles: targetTitles,
          page: 1,
          per_page: 5,
        };
        if (orgId) {
          searchBody.organization_ids = [orgId];
        } else {
          searchBody.q_organization_domains = cleanDomain;
        }

        const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': keyEntry.apiKey.trim(),
          },
          body: JSON.stringify(searchBody),
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
          let people = data.people || [];

          // The organization_id search came up empty — try again with the
          // raw domain before giving up on this key, in case the name
          // lookup resolved the wrong organization or Apollo's domain
          // index actually does have this one under the given domain.
          if (people.length === 0 && orgId) {
            const domainRes = await fetch('https://api.apollo.io/v1/mixed_people/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': keyEntry.apiKey.trim(),
              },
              body: JSON.stringify({
                q_organization_domains: cleanDomain,
                person_titles: targetTitles,
                page: 1,
                per_page: 5,
              }),
            });
            if (domainRes.ok) {
              const domainData = await domainRes.json().catch(() => ({}));
              people = domainData.people || [];
            }
          }

          const isUsableEmail = (email: any) => typeof email === 'string' && email.length > 0 && !email.includes('not_unlocked') && !email.includes('email_unavailable');

          // Some Apollo plans return an already-unlocked email straight in
          // search results — use it for free if it's there.
          let person = people.find((p: any) => isUsableEmail(p.email) && p.email_status === 'verified') || people.find((p: any) => isUsableEmail(p.email));

          if (!person && people.length > 0) {
            // The People Search endpoint never actually includes a real
            // email — Apollo locks it behind a separate People Match
            // (enrichment) call, the exact same one apollo.io's own web UI
            // fires when you open a search result (that's what the credit
            // cost you see there is for). Without this second call, this
            // cascade could never find a real email even when Apollo
            // clearly has one for the person.
            //
            // Only the top candidate used to be tried — if Apollo simply
            // didn't have a revealable email for that one specific person,
            // the whole domain was given up on even when the next
            // candidate down the list had one. Try up to the first 3
            // (bounding the credit cost) and stop at the first real email.
            let limitReached = false;
            for (const candidate of people.slice(0, 3)) {
              try {
                const matchRes = await fetch('https://api.apollo.io/v1/people/match', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': keyEntry.apiKey.trim(),
                  },
                  body: JSON.stringify({
                    id: candidate.id,
                    reveal_personal_emails: true,
                  }),
                });

                if (matchRes.status === 429 || matchRes.status === 402 || matchRes.status === 403) {
                  console.warn(`⚠️ Apollo Key [${keyEntry.name}] blocked on enrichment (Status ${matchRes.status}). Auto-switching to next key...`);
                  keyEntry.status = 'LIMIT_REACHED';
                  keyEntry.lastError = `Enrichment blocked or HTTP ${matchRes.status}`;
                  await this.savePool(pool);
                  limitReached = true;
                  break;
                }

                if (matchRes.ok) {
                  const matchData = await matchRes.json().catch(() => ({}));
                  if (isUsableEmail(matchData?.person?.email)) {
                    person = matchData.person;
                    break;
                  }
                }
              } catch (err: any) {
                console.error(`Error revealing Apollo contact email with key [${keyEntry.name}]:`, err.message);
              }
            }
            if (limitReached) continue;
          }

          // Only ever return a person Apollo actually gave us a real email
          // for — never fabricate a "contact@domain.com" guess, which would
          // bounce and damage sender reputation.
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

        if (res.status === 429 || res.status === 402) {
          // Rate limit / billing — genuinely account-wide, affects every
          // Apollo capability this key has.
          keyEntry.status = 'LIMIT_REACHED';
          keyEntry.lastError = `Company search blocked (HTTP ${res.status})`;
          await this.savePool(pool);
          continue; // try next key
        }

        if (res.status === 403) {
          // 403 here means this specific plan doesn't include the
          // Organization/Company Search endpoint — a different Apollo
          // capability from People Search + Enrichment (which is what
          // findDecisionMaker uses to find contact emails). Marking the
          // whole key LIMIT_REACHED on this used to silently disable
          // email-finding for every company too, even when People Search
          // and reveal were both working fine on this same key.
          keyEntry.lastError = `Company search not available on this plan (HTTP 403)`;
          await this.savePool(pool);
          continue; // try next key for company search only — key stays ACTIVE
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
