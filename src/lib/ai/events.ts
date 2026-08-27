import { ScoringEngine, EventScoringInput } from './scoring-engine';
import { EvidenceSource, PriorityLevel } from '@/types';

export interface EventCandidateInput {
  name: string;
  eventType: string;
  startDate: Date | string;
  endDate?: Date | string;
  venueName: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  expectedAttendance?: number;
  vipPresenceLikelihood?: string;
  organizerName?: string;
  organizerCompany?: string;
  organizerWebsite?: string;
  sourceUrl?: string;
}

export class EventIntelligenceEngine {
  static analyzeEvent(data: EventCandidateInput, customWeights?: Record<string, number>) {
    const city = data.city || 'Melbourne';
    const startDate = new Date(data.startDate);
    const now = new Date();
    const diffTime = startDate.getTime() - now.getTime();
    const daysUntil = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const attendance = data.expectedAttendance || 600;
    const vipLikelihood = data.vipPresenceLikelihood || (attendance > 1000 ? 'HIGH' : 'MEDIUM');

    const scoringInput: EventScoringInput = {
      expectedAttendance: attendance,
      vipPresenceLikelihood: vipLikelihood,
      city,
      eventType: data.eventType,
      daysUntilEvent: daysUntil,
    };

    const { score, priority, breakdown, reasoning } = ScoringEngine.calculateEventScore(scoringInput, customWeights);

    const transportSignals = [
      `Estimated ${attendance.toLocaleString()} delegates convening at ${data.venueName}`,
      `Keynote speakers and VIP delegates arriving via ${city} Airport requiring flight tracking`,
      'VIP dinner transfers and inter-hotel shuttle requirements for senior attendees',
    ];

    const evidenceSources: EvidenceSource[] = [
      {
        title: `${data.name} Official Event Listing`,
        url: data.sourceUrl || data.organizerWebsite || `https://mcec.com.au`,
        snippet: `${data.name} taking place at ${data.venueName}, ${city} starting on ${startDate.toLocaleDateString('en-AU')}.`,
      },
    ];

    const whyRelevant = `Upcoming ${data.eventType.toLowerCase().replace('_', ' ')} with ~${attendance.toLocaleString()} attendees at ${data.venueName}. Significant demand for VIP speaker airport transfers, executive group vans (Mercedes V-Class), and punctual delegate transit.`;

    const recommendedServices = [
      'Corporate Event & Conference Transfers',
      'VIP & Luxury Private Transportation',
      'Group Transfers & Luxury People Movers',
    ];

    const outreachAngle = `Offering dedicated VIP speaker airport arrivals with flight tracking and luxury Mercedes V-Class group shuttles for ${data.name} organizers.`;

    const summary = `${data.name} is a major ${data.eventType.toLowerCase().replace('_', ' ')} hosted at ${data.venueName} in ${city}. Expected attendance of ~${attendance.toLocaleString()} attendees creates immediate high-value transport logistics opportunities for keynote speakers and corporate delegations.`;

    return {
      score,
      priority,
      scoreBreakdown: breakdown,
      scoreReasoning: reasoning,
      summary,
      transportationDemandSignals: transportSignals,
      vipExecutiveRelevance: vipLikelihood === 'HIGH' ? 'High VIP and Keynote Speaker presence' : 'Moderate executive presence',
      groupTransferPotential: attendance >= 500 ? 'High requirement for Mercedes V-Class and luxury vans' : 'Standard sedan transfers',
      airportTransferRelevance: 'High priority for interstate and international speaker flight arrivals',
      evidenceSources,
      whyRelevant,
      recommendedServices,
      outreachAngle,
    };
  }

  static getEventOrganizerRoles(): string[] {
    return [
      'Head of Event Operations & Logistics',
      'Event Director / Lead Producer',
      'Conference Logistics Manager',
      'Head of Partnerships & Sponsorships',
      'Director of Operations',
      'Event Coordinator / Assistant',
    ];
  }
}
