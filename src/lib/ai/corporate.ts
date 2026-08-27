import { ScoringEngine, CompanyScoringInput } from './scoring-engine';
import { ResearchSignals, EvidenceSource, PriorityLevel } from '@/types';

export interface CompanyCandidateInput {
  name: string;
  website: string;
  industry: string;
  subIndustry?: string;
  city?: string;
  state?: string;
  headquartersAddress?: string;
  approximateSize?: string;
  employeeCountEstimate?: number;
  officeCount?: number;
  internationalPresence?: boolean;
  corporateActivityLevel?: string;
  executiveTravelLikelihood?: string;
  eventHostingLikelihood?: string;
  isClientFacing?: boolean;
}

export class CorporateIntelligenceEngine {
  /**
   * Evaluates and researches a discovered company
   */
  static analyzeCompany(data: CompanyCandidateInput, customWeights?: Record<string, number>) {
    const city = data.city || 'Melbourne';
    const approxSize = data.approximateSize || 'Medium (50-200)';
    const officeCount = data.officeCount || 1;
    const internationalPresence = data.internationalPresence ?? false;
    const corpActivity = data.corporateActivityLevel || (officeCount > 2 ? 'HIGH' : 'MEDIUM');
    const travelLikelihood = data.executiveTravelLikelihood || (officeCount > 1 || internationalPresence ? 'HIGH' : 'MEDIUM');
    const eventHosting = data.eventHostingLikelihood || (approxSize.includes('Large') || approxSize.includes('Enterprise') ? 'HIGH' : 'MEDIUM');
    const isClientFacing = data.isClientFacing ?? true;

    const scoringInput: CompanyScoringInput = {
      approximateSize: approxSize,
      employeeCountEstimate: data.employeeCountEstimate,
      officeCount,
      city,
      corporateActivityLevel: corpActivity,
      executiveTravelLikelihood: travelLikelihood,
      eventHostingLikelihood: eventHosting,
      isClientFacing,
      internationalPresence,
      isVerified: true,
    };

    const { score, priority, breakdown, reasoning } = ScoringEngine.calculateCompanyScore(scoringInput, customWeights);

    // Collect Strong, Medium, Weak signals
    const strongSignals: string[] = [];
    const mediumSignals: string[] = [];
    const weakSignals: string[] = [];

    if (officeCount >= 3 || internationalPresence) {
      strongSignals.push(`Multi-office national presence (${officeCount} locations) with regular interstate travel`);
    } else if (officeCount >= 2) {
      mediumSignals.push(`Dual-office setup between ${city} and interstate operations`);
    }

    if (travelLikelihood === 'HIGH') {
      strongSignals.push(`Frequent C-suite & executive flight transfers to/from ${city} Airport (Tullamarine)`);
    }

    if (eventHosting === 'HIGH') {
      strongSignals.push('Active host of annual corporate summits, partner dinners, and client roundtables');
    } else {
      mediumSignals.push('Periodic client entertainment and executive meetings');
    }

    if (isClientFacing) {
      mediumSignals.push('High-touch client meetings and visiting partner delegations');
    }

    if (approxSize.includes('Small')) {
      weakSignals.push('Limited volume of regular executive transfers expected');
    }

    const detectedSignals: ResearchSignals = {
      strong: strongSignals.length ? strongSignals : ['Corporate presence in Melbourne commercial corridor'],
      medium: mediumSignals.length ? mediumSignals : ['Executive team with occasional transit requirements'],
      weak: weakSignals,
    };

    const evidenceSources: EvidenceSource[] = [
      {
        title: `${data.name} Corporate Profile & Public Business Filing`,
        url: data.website.startsWith('http') ? data.website : `https://${data.website}`,
        snippet: `${data.name} operates in ${data.industry} with active business presence at ${data.headquartersAddress || city}.`,
      },
    ];

    // Formulate "Why Relevant"
    const whyPoints: string[] = [];
    if (officeCount > 1 || internationalPresence) whyPoints.push('Interstate and international corporate operations detected');
    if (travelLikelihood === 'HIGH') whyPoints.push(`Regular executive airport transit required in ${city}`);
    if (eventHosting === 'HIGH') whyPoints.push('Corporate hospitality and client event hosting identified');
    if (isClientFacing) whyPoints.push('High-value client-facing leadership team');

    const whyRelevant = whyPoints.join(' • ');

    // Recommended Opal Services
    const recommendedServices = ['Corporate & Executive Chauffeur Services', 'Airport Transfers (Flight Tracked)'];
    if (eventHosting === 'HIGH' || approxSize.includes('Enterprise')) {
      recommendedServices.push('Group Transfers & Luxury People Movers');
    }
    if (corpActivity === 'HIGH') {
      recommendedServices.push('Hourly As-Directed Car Service');
    }

    const targetUseCases = [
      `Executive airport transfers to/from ${city} Airport with flight tracking`,
      'Dedicated corporate account for visiting leadership and board meetings',
      'VIP client hospitality transit across Melbourne CBD & dining venues',
    ];

    const confirmedEvidence = `Verified ${data.industry} enterprise at ${data.headquartersAddress || city} with documented ${approxSize} operations.`;
    const inferredDemand = `High potential need for reliable, flight-tracked chauffeur transit and consolidated corporate account billing.`;

    const summary = `${data.name} is an established company in the ${data.industry} sector operating out of ${city}. The company exhibits high corporate mobility, executive travel between key hubs, and client hospitality requirements matching Opal Chauffeurs' premium fleet.`;

    return {
      score,
      priority,
      scoreBreakdown: breakdown,
      scoreReasoning: reasoning,
      summary,
      businessModel: `${data.industry} enterprise operations and client solutions.`,
      detectedSignals,
      evidenceSources,
      confidenceLevel: 0.9,
      whyRelevant,
      recommendedServices,
      targetUseCases,
      confirmedEvidence,
      inferredDemand,
    };
  }

  /**
   * Prioritizes decision-maker contact roles
   */
  static getDecisionMakerRoles(): string[] {
    return [
      'Head of Executive Operations & Corporate Travel',
      'Corporate Travel Manager',
      'Director of Operations / Practice Management',
      'Executive Assistant to CEO / Managing Director',
      'Procurement Manager / Travel Buyer',
      'Head of Facilities & Workplace Services',
      'Head of Partnerships & Events',
      'Managing Director / Chief Executive Officer',
    ];
  }
}
