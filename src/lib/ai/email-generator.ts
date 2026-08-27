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
   * Generates a 2-layer personalized email:
   * Fixed Content (Opal Brand & Signature) + Dynamic Contextual Personalization
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

    let subject = '';
    let dynamicIntro = '';
    let dynamicValuePoints = '';
    let personalizationReasoning = '';
    const evidenceCited: string[] = [];

    if (isEvent) {
      subject = `VIP Speaker & Executive Ground Transportation for ${context.eventName || 'Upcoming Event'} in ${location}`;
      dynamicIntro = `With preparations for ${context.eventName} underway at ${context.venue || location}, coordinating punctual and reliable executive transportation for keynote speakers and arriving delegations is essential to a seamless event experience.`;
      
      dynamicValuePoints = `• Keynote Speaker & VIP Airport Transfers: Meet-and-greet arrivals at ${location} Airport with real-time flight radar tracking, ensuring seamless curb-to-venue transit.
• Luxury Group Shuttles: Mercedes-Benz V-Class people movers suited for executive panels, dinner transfers, and sponsor groups between local hotels and ${context.venue || 'the venue'}.
• Dedicated Logistics Coordination: Direct point of contact for your operations team to manage speaker arrival manifests and dynamic schedule changes.`;

      personalizationReasoning = `Referenced event ${context.eventName}, venue ${context.venue}, and tailored the pitch to VIP speaker transit and Mercedes V-Class group transfers for the event operations team.`;
      evidenceCited.push(`Event: ${context.eventName}`, `Venue: ${context.venue || location}`, `Role: ${recipient.role}`);
    } else {
      subject = `Executive Chauffeur & Airport Transport Partnership for ${recipient.companyName || 'Your Team'}`;
      dynamicIntro = `With ${recipient.companyName}’s corporate presence in ${location} and ongoing executive travel requirements, having a dependable luxury chauffeur service ensures an effortless, punctual journey for your leadership and visiting clients.`;

      dynamicValuePoints = `• Real-Time Flight-Tracked Airport Transfers: Inside-terminal meet-and-greet at ${location} Airport (Tullamarine) with live radar flight monitoring—eliminating waiting times and transit delays.
• Priority Corporate Accounts: Streamlined monthly billing, dedicated account liaison, and 24/7 priority bookings for senior leadership and visiting board members.
• Executive European Fleet: Immaculate Mercedes-Benz sedans, luxury SUVs, and Mercedes V-Class vehicles accommodating both individual C-suite travel and team delegations.`;

      personalizationReasoning = `Addressed to ${recipient.role} at ${recipient.companyName}; emphasized corporate flight tracking, executive billing, and luxury European fleet without making unauthorized discount claims.`;
      evidenceCited.push(`Company: ${recipient.companyName}`, `Location: ${location}`, `Industry: ${context.industry || 'Corporate'}`);
    }

    const fullBodyText = `Dear ${recipientFirstName},

I hope this week is treating you well.

${dynamicIntro}

I am reaching out on behalf of Opal Chauffeurs to introduce our executive and corporate transportation services. We support corporate travel desks and event organizers with:

${dynamicValuePoints}

We would welcome the opportunity to connect briefly to discuss how we can support ${recipient.companyName || context.eventName || 'your organization'} with our executive fleet and corporate booking facilities.

Would you be open to a brief 5-minute conversation or reviewing our corporate service overview?

Warm regards,

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
}
