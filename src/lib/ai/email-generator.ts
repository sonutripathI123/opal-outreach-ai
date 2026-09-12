import { AIClient } from './client';

export interface EmailGenerationParams {
  businessProfile: {
    companyName: string;
    tradingName?: string;
    website: string;
    description: string;
    brandPositioning: string;
    emailSignature: string;
    collaborationOffer: string;
  };
  recipient: {
    name: string;
    role: string;
    companyName?: string;
    email: string;
  };
  context: {
    type: 'COMPANY' | 'EVENT';
    industry?: string;
    location?: string;
    venue?: string;
    eventName?: string;
    signals?: string[];
    recommendedServices?: string[];
    whyRelevant?: string;
  };
  customTone?: string;
}

export class EmailGenerator {
  /**
   * Generates a tailored, role-specific 2-layer personalized email:
   * Dynamically adapts value propositions for EAs, Travel Managers, Event Directors & Operations Heads.
   */
  static generateEmail(params: EmailGenerationParams): {
    subject: string;
    fixedContent: string;
    dynamicContent: string;
    fullBodyText: string;
    personalizationReasoning: string;
    evidenceCited: string[];
  } {
    const { recipient, context } = params;
    const isEvent = context.type === 'EVENT';
    const recipientFirstName = recipient.name.split(' ')[0] || recipient.name;
    const location = context.location || 'Melbourne';
    const roleLower = (recipient.role || '').toLowerCase();
    const companyOrEvent = recipient.companyName || context.eventName || 'your organization';

    let subject = '';
    let dynamicIntro = '';
    let dynamicValuePoints = '';
    let personalizationReasoning = '';
    const evidenceCited: string[] = [];

    // =========================================================================
    // 1. EVENT MANAGERS & CONFERENCE PRODUCERS
    // =========================================================================
    if (isEvent || roleLower.includes('event') || roleLower.includes('conference') || roleLower.includes('exhibition') || roleLower.includes('producer')) {
      const eventTitle = context.eventName || 'Upcoming Conference';
      const venueName = context.venue || `${location} Convention Centre`;

      subject = `VIP Speaker & Executive Ground Transportation for ${eventTitle} at ${venueName}`;
      dynamicIntro = `With preparations for ${eventTitle} underway at ${venueName}, coordinating punctual and reliable executive transportation for keynote speakers, international delegates, and VIP panels is essential to delivering a flawless event experience.`;
      
      dynamicValuePoints = `• Keynote Speaker & VIP Airport Meet-and-Greet: Direct terminal pickups at ${location} Airport with live flight radar tracking—ensuring stress-free arrivals regardless of flight delays.
• Luxury Mercedes V-Class Group Shuttles: Premium 7-seater people movers tailored for executive panel transfers, sponsor dinners, and venue shuttles between partner hotels and ${venueName}.
• Dedicated Logistics Coordinator: A single point of contact for your event operations desk to manage flight manifests, schedule adjustments, and multi-vehicle deployments.`;

      personalizationReasoning = `Tailored specifically for Event Operations & Conference Leadership. Emphasized VIP speaker airport radar tracking, Mercedes V-Class group shuttles, and dedicated event transport manifests.`;
      evidenceCited.push(`Event: ${eventTitle}`, `Venue: ${venueName}`, `Role: ${recipient.role}`);

    // =========================================================================
    // 2. EXECUTIVE ASSISTANTS & CHIEFS OF STAFF (EA to CEO / Managing Director)
    // =========================================================================
    } else if (
      roleLower.includes('executive assistant') ||
      roleLower.includes('ea') ||
      roleLower.includes('pa') ||
      roleLower.includes('chief of staff') ||
      roleLower.includes('personal assistant')
    ) {
      subject = `Executive Chauffeur & Airport Transport Support for ${recipient.companyName} Leadership`;
      dynamicIntro = `Understanding the precision required in managing senior executive schedules, board member itineraries, and visiting client transits at ${recipient.companyName}, having a dedicated, discreet luxury chauffeur partner ensures total peace of mind for your office.`;

      dynamicValuePoints = `• Live Radar Flight-Tracked Airport Transfers: Inside-terminal meet-and-greet at ${location} Airport (Tullamarine) with proactive flight tracking—so your leadership is never left waiting, even with schedule changes.
• Effortless Executive Booking: Direct priority reservation channel with instant confirmations, detailed driver manifests, and vehicle tracking for your executive desk.
• First-Class European Fleet: Pristine Mercedes-Benz S-Class, E-Class sedans, luxury SUVs, and Mercedes V-Class vehicles maintained to immaculate standards.`;

      personalizationReasoning = `Tailored for Executive Assistants & Chiefs of Staff. Focused on itinerary reliability, inside-terminal meet-and-greet, zero executive wait times, and seamless booking communication.`;
      evidenceCited.push(`Company: ${recipient.companyName}`, `Role: ${recipient.role}`, `Target Priority: Executive Schedule Protection`);

    // =========================================================================
    // 3. CORPORATE TRAVEL MANAGERS & PROCUREMENT LEADS
    // =========================================================================
    } else if (
      roleLower.includes('travel') ||
      roleLower.includes('procurement') ||
      roleLower.includes('sourcing') ||
      roleLower.includes('commercial')
    ) {
      subject = `Corporate Chauffeur Fleet & Ground Transport Partnership for ${recipient.companyName}`;
      dynamicIntro = `As you oversee corporate travel procurement and executive mobility for ${recipient.companyName}, having a reliable, compliant, and transparent ground transport partner in ${location} is key to optimizing travel efficiency and duty-of-care.`;

      dynamicValuePoints = `• Preferred Corporate Account Rates: Transparent corporate rate cards with consolidated monthly invoicing and zero surge pricing during peak periods.
• Comprehensive Duty of Care: Fully accredited, commercially insured, and professionally vetted chauffeurs with live vehicle tracking and flight status monitoring.
• Scalable Fleet Coverage: Coordinated luxury sedans, SUVs, and Mercedes V-Class people movers catering to daily corporate commutes, interstate fly-ins, and group roadshows.`;

      personalizationReasoning = `Tailored for Corporate Travel Managers & Procurement Leads. Emphasized consolidated monthly corporate billing, Duty-of-Care compliance, zero surge pricing, and fixed account rates.`;
      evidenceCited.push(`Company: ${recipient.companyName}`, `Role: ${recipient.role}`, `Focus: Corporate Rates & Compliance`);

    // =========================================================================
    // 4. OPERATIONS DIRECTORS, PRACTICE MANAGERS & OFFICE HEADS
    // =========================================================================
    } else {
      subject = `Executive Chauffeur & Ground Transportation Partnership for ${recipient.companyName}`;
      dynamicIntro = `With ${recipient.companyName}’s corporate presence in ${location} and ongoing executive travel requirements, having a dependable luxury chauffeur service ensures an effortless, punctual journey for your leadership team and visiting clients.`;

      dynamicValuePoints = `• Real-Time Flight-Tracked Airport Transfers: Inside-terminal meet-and-greet at ${location} Airport (Tullamarine) with live radar monitoring—eliminating waiting times and transit delays.
• Priority Corporate Accounts: Streamlined monthly billing, dedicated account liaison, and 24/7 priority bookings for senior leadership and client meetings.
• Executive European Fleet: Immaculate Mercedes-Benz sedans, luxury SUVs, and Mercedes V-Class vehicles accommodating both individual C-suite travel and team delegations.`;

      personalizationReasoning = `Addressed to ${recipient.role} at ${recipient.companyName}; emphasized operational reliability, corporate billing facilities, and luxury European fleet.`;
      evidenceCited.push(`Company: ${recipient.companyName}`, `Location: ${location}`, `Industry: ${context.industry || 'Corporate'}`);
    }

    const fullBodyText = `Dear ${recipientFirstName},

I hope this week is treating you well.

${dynamicIntro}

I am reaching out on behalf of Opal Chauffeurs to introduce our executive and corporate transportation services. We support corporate travel desks and event organizers with:

${dynamicValuePoints}

We would welcome the opportunity to connect briefly to discuss how we can support ${companyOrEvent} with our executive fleet and corporate booking facilities.

Would you be open to a brief 5-minute conversation or reviewing our corporate service overview?

Warm regards,

Inaya
Corporate Partnerships Team
Opal Chauffeurs
Web: https://www.opalchauffeurs.com.au/
Email: book@opalchauffeurs.com.au | Direct: +61 432 000 718`;

    const fixedContent = `Opal Chauffeurs is a Melbourne-based premium chauffeur service providing flight-tracked airport transfers, corporate accounts, and executive travel across Melbourne with an immaculate fleet of executive sedans, luxury SUVs, and Mercedes V-Class people movers.`;
    const dynamicContent = dynamicIntro;

    return {
      subject,
      fixedContent,
      dynamicContent,
      fullBodyText,
      personalizationReasoning,
      evidenceCited,
    };
  }

  /**
   * AI-powered personalized email generation using Claude.
   * Falls back to the deterministic template if AI is disabled, has no API
   * key, or fails/returns invalid output — so callers never break.
   */
  static async generateEmailSmart(params: EmailGenerationParams): Promise<{
    subject: string;
    fixedContent: string;
    dynamicContent: string;
    fullBodyText: string;
    personalizationReasoning: string;
    evidenceCited: string[];
    generatedBy: 'AI' | 'TEMPLATE';
  }> {
    const template = this.generateEmail(params);

    // Cost/latency kill-switch.
    if (process.env.AI_EMAIL_GENERATION === 'false') {
      return { ...template, generatedBy: 'TEMPLATE' };
    }

    try {
      const apiKey = await AIClient.getApiKey();
      if (!apiKey) return { ...template, generatedBy: 'TEMPLATE' };

      const { businessProfile: bp, recipient, context } = params;
      const isEvent = context.type === 'EVENT';
      const signals = (context.signals || []).join('; ');
      const services = (context.recommendedServices || []).join(', ');

      const systemPrompt = `You are an expert B2B outreach copywriter for ${bp.companyName}, a premium Melbourne chauffeur and executive transport company. You write concise, warm, professional cold outreach emails to corporate decision-makers and event organisers. Emails must be specific and personalised (never generic spam), 110-170 words, in Australian English, with one clear soft call-to-action. Do NOT invent facts about the recipient's company; only use the context provided. Never write generic filler that could apply to any company (e.g. "your corporate presence and ongoing executive travel requirements") — if you don't have specific evidence about this company, instead ground the opening in one concrete, well-known characteristic of their industry (e.g. real estate agents doing property inspections and client meetings across multiple suburbs; law firms with late-night deal closings; consultancies with interstate client visits) so the email still reads as relevant to this type of business, not as a template. Return ONLY a valid JSON object — no markdown, no commentary.`;

      const userPrompt = `Write a personalised outreach email.

SENDER (us):
- Company: ${bp.companyName}${bp.tradingName ? ` (${bp.tradingName})` : ''}
- Website: ${bp.website}
- Positioning: ${bp.brandPositioning}
- What we offer: ${bp.collaborationOffer}
- Services to highlight: ${services || 'Executive chauffeur, flight-tracked airport transfers, corporate accounts, VIP & group transfers'}

RECIPIENT:
- Name: ${recipient.name}
- Role: ${recipient.role}
- ${isEvent ? 'Event' : 'Company'}: ${recipient.companyName || context.eventName || ''}
- Industry: ${context.industry || 'Corporate'}
- Location: ${context.location || 'Melbourne'}
${context.venue ? `- Venue: ${context.venue}` : ''}
${context.whyRelevant ? `- Why relevant: ${context.whyRelevant}` : ''}
${signals ? `- Signals: ${signals}` : ''}

REQUIREMENTS:
- Address the recipient by first name.
- Reference something specific about their ${isEvent ? 'event' : 'company/role'} from the context above. If the only specifics available are the industry and location, build the opening around a concrete, industry-typical scenario (not "corporate presence" / "executive travel requirements" style filler that fits any company).
- End the body with EXACTLY this signature block, verbatim:
${bp.emailSignature}

Return JSON with this exact shape:
{
  "subject": "string (max 78 chars, specific, no emojis)",
  "body": "string (full email body INCLUDING the signature block at the end; plain text using \\n for line breaks)",
  "reasoning": "string (1-2 sentences on why this is personalised)",
  "evidence": ["short string", "short string"]
}`;

      const res = await AIClient.complete({
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 1100,
        responseFormat: 'json',
      });

      // Only accept genuine Claude output (not the synthesized fallback engine).
      if (res.provider !== 'anthropic-claude') {
        return { ...template, generatedBy: 'TEMPLATE' };
      }

      const parsed = this.parseJson(res.content);
      if (!parsed || !parsed.subject || !parsed.body) {
        return { ...template, generatedBy: 'TEMPLATE' };
      }

      const fullBodyText = String(parsed.body).trim();
      const paragraphs = fullBodyText.split('\n\n');
      const dynamicContent = paragraphs.length > 1 ? paragraphs.slice(1, 2).join('\n\n') : fullBodyText;

      return {
        subject: String(parsed.subject).trim().slice(0, 140),
        fixedContent: template.fixedContent,
        dynamicContent,
        fullBodyText,
        personalizationReasoning: parsed.reasoning ? String(parsed.reasoning) : template.personalizationReasoning,
        evidenceCited: Array.isArray(parsed.evidence)
          ? parsed.evidence.map((e: any) => String(e)).slice(0, 6)
          : template.evidenceCited,
        generatedBy: 'AI',
      };
    } catch (err) {
      console.warn('AI email generation failed, using template fallback:', err);
      return { ...template, generatedBy: 'TEMPLATE' };
    }
  }

  private static parseJson(text: string): any | null {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {}
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {}
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
}
