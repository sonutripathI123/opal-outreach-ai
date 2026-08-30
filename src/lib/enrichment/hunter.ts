export interface HunterEmail {
  value: string;
  type: string;
  confidence: number;
  firstName: string;
  lastName: string;
  position: string;
  seniority: string;
  department: string;
  linkedin: string | null;
  twitter: string | null;
  phoneNumber: string | null;
}

export interface HunterDomainSearchResult {
  domain: string;
  disposable: boolean;
  webmail: boolean;
  acceptAll: boolean;
  pattern: string | null;
  organization: string;
  emails: HunterEmail[];
}

export class HunterClient {
  /**
   * Verify Hunter API key & fetch account usage
   */
  static async verifyKey(apiKey: string): Promise<{ success: boolean; error?: string; account?: any }> {
    try {
      const cleanKey = apiKey.trim();
      const res = await fetch(`https://api.hunter.io/v2/account?api_key=${cleanKey}`);
      const data = await res.json();

      if (!res.ok || data.errors) {
        const errorMsg = data.errors?.[0]?.details || 'Authentication failed for Hunter.io API key';
        return { success: false, error: errorMsg };
      }

      return {
        success: true,
        account: {
          email: data.data?.email,
          planName: data.data?.plan_name,
          requestsRemaining: data.data?.requests?.searches?.available,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error verifying Hunter API key' };
    }
  }

  /**
   * Search all verified contacts and decision-makers for a company domain
   */
  static async domainSearch(domain: string, apiKey: string, limit: number = 10): Promise<{
    success: boolean;
    result?: HunterDomainSearchResult;
    error?: string;
  }> {
    try {
      const cleanKey = apiKey.trim();
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(cleanDomain)}&limit=${limit}&api_key=${cleanKey}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || data.errors) {
        const errorMsg = data.errors?.[0]?.details || `Hunter.io domain search failed for ${domain}`;
        return { success: false, error: errorMsg };
      }

      const rawEmails = data.data?.emails || [];
      const emails: HunterEmail[] = rawEmails.map((e: any) => ({
        value: e.value,
        type: e.type,
        confidence: e.confidence,
        firstName: e.first_name || '',
        lastName: e.last_name || '',
        position: e.position || 'Corporate Executive',
        seniority: e.seniority || 'senior',
        department: e.department || 'executive',
        linkedin: e.linkedin || null,
        twitter: e.twitter || null,
        phoneNumber: e.phone_number || null,
      }));

      return {
        success: true,
        result: {
          domain: data.data?.domain || cleanDomain,
          disposable: data.data?.disposable || false,
          webmail: data.data?.webmail || false,
          acceptAll: data.data?.accept_all || false,
          pattern: data.data?.pattern || null,
          organization: data.data?.organization || cleanDomain.split('.')[0],
          emails,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to query Hunter domain search API' };
    }
  }
}
