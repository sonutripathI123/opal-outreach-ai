import { prisma } from '@/lib/prisma';

const API_BASE = 'https://api.explorium.ai';

export interface VibeProspectingContactResult {
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
}

// Job levels worth targeting for a corporate chauffeur outreach — owners,
// executives and operations/travel decision-makers.
const DECISION_MAKER_JOB_LEVELS = [
  'owner',
  'c-suite',
  'vice president',
  'director',
  'senior manager',
  'manager',
  'partner',
  'founder',
  'president',
];

export class VibeProspectingClient {
  static async getApiKey(): Promise<string | null> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: 'vibe_prospecting_api_key' },
      });
      if (setting?.value && setting.value.trim() !== '' && !setting.value.includes('••••')) {
        return setting.value.trim();
      }
    } catch (e) {
      console.error('Error fetching Vibe Prospecting API key:', e);
    }
    return null;
  }

  static async testKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/v1/businesses/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_key: apiKey.trim(),
        },
        body: JSON.stringify({
          businesses_to_match: [{ name: 'Google', domain: 'google.com' }],
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const matched = data?.matched_businesses?.[0];
        if (matched?.business_id) {
          return { success: true, message: 'Vibe Prospecting (Explorium) API key is valid and connected!' };
        }
        return { success: true, message: 'Connected to Explorium — key is valid (test match returned no business).' };
      }

      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.detail?.[0]?.msg || errData.message || `Explorium returned error code ${res.status}`,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error connecting to Explorium (Vibe Prospecting)' };
    }
  }

  private static async matchBusiness(domain: string, companyName: string, apiKey: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/v1/businesses/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_key: apiKey,
        },
        body: JSON.stringify({
          businesses_to_match: [{ name: companyName, domain }],
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      const matched = data?.matched_businesses?.[0];
      return matched?.business_id || null;
    } catch (err) {
      console.warn('Vibe Prospecting business match error:', err);
      return null;
    }
  }

  private static async fetchProspects(businessId: string, apiKey: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/v1/prospects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_key: apiKey,
        },
        body: JSON.stringify({
          mode: 'full',
          size: 10,
          page_size: 10,
          page: 1,
          filters: {
            business_id: { values: [businessId] },
            job_level: { values: DECISION_MAKER_JOB_LEVELS },
            has_contact_details: { value: 'email_or_phone' },
          },
        }),
      });

      if (!res.ok) return [];
      const data = await res.json();
      return data?.data || [];
    } catch (err) {
      console.warn('Vibe Prospecting fetch prospects error:', err);
      return [];
    }
  }

  private static async enrichContact(prospectId: string, apiKey: string): Promise<{ email?: string; phone?: string } | null> {
    try {
      const res = await fetch(`${API_BASE}/v2/prospects/contact_information/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          api_key: apiKey,
        },
        body: JSON.stringify({ prospect_id: prospectId }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      // Explorium's docs for this endpoint don't publish a full response
      // schema — "professional_email" matches the column name Explorium's
      // own CSV export uses for the same underlying enrichment, with a few
      // fallback field names in case the live shape differs.
      const record = data?.data ?? data;
      const email =
        record?.professional_email ||
        record?.email ||
        record?.emails?.[0] ||
        record?.professional_emails?.[0] ||
        null;
      const phone = record?.mobile_phone || record?.phone || record?.phone_numbers?.[0] || null;

      if (!email && !phone) return null;
      return { email: email || undefined, phone: phone || undefined };
    } catch (err) {
      console.warn('Vibe Prospecting contact enrich error:', err);
      return null;
    }
  }

  /**
   * Domain -> decision-maker contact via Match Business -> Fetch Prospects
   * -> Contact Information enrich. Returns null at any step that comes up
   * empty rather than fabricating a contact.
   */
  static async findDecisionMaker(domain: string, companyName: string): Promise<VibeProspectingContactResult | null> {
    const apiKey = await this.getApiKey();
    if (!apiKey) return null;

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
    const businessId = await this.matchBusiness(cleanDomain, companyName, apiKey);
    if (!businessId) return null;

    const prospects = await this.fetchProspects(businessId, apiKey);
    if (prospects.length === 0) return null;

    for (const p of prospects) {
      const contact = await this.enrichContact(p.prospect_id, apiKey);
      if (contact?.email) {
        const fullName = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
        return {
          fullName: fullName || 'Executive Operations Lead',
          firstName: p.first_name,
          lastName: p.last_name,
          jobTitle: p.job_title || p.job_level_main || 'Corporate Operations & Travel Contact',
          department: p.job_department_main || p.job_department || 'Operations',
          email: contact.email,
          emailConfidence: 0.85,
          verificationStatus: 'LIKELY',
          linkedinUrl: p.linkedin,
          phone: contact.phone,
        };
      }
    }

    return null;
  }
}
