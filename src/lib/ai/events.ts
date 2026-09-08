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

    // Transport/outreach narrative genuinely depends on what kind of event
    // this is — a sports fixture doesn't have "keynote speakers", a festival
    // doesn't have "delegates". Branch by eventType instead of writing one
    // conference-flavoured template over every event.
    const isSporting = data.eventType === 'SPORTING_EVENT';
    const isPerformance = data.eventType === 'GALA_DINNER' || data.eventType === 'VIP_GATHERING';
    const isCommunity = data.eventType === 'VIP_GATHERING' && attendance < 500;

    const attendeeNoun = isSporting ? 'spectators' : isPerformance ? 'guests' : 'delegates';

    const transportSignals = isSporting
      ? [
          `Estimated ${attendance.toLocaleString()} spectators attending at ${data.venueName}`,
          `Corporate box holders, sponsors and team officials requiring premium match-day transfers`,
          'Pre/post-match group shuttles from CBD hotels to venue and return',
        ]
      : isPerformance
      ? [
          `Estimated ${attendance.toLocaleString()} guests attending at ${data.venueName}`,
          `VIP guest and performer/talent transfers to and from the venue`,
          'Group shuttles for guests travelling from hotels or after-parties',
        ]
      : [
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

    const whyRelevant = isSporting
      ? `Upcoming sporting event with ~${attendance.toLocaleString()} spectators at ${data.venueName}. Demand for corporate box/sponsor transfers, team and officials logistics, and pre/post-match group shuttles.`
      : isPerformance
      ? `Upcoming ${data.eventType.toLowerCase().replace('_', ' ')} with ~${attendance.toLocaleString()} guests at ${data.venueName}. Demand for VIP guest transfers and group shuttles to/from the venue.`
      : `Upcoming ${data.eventType.toLowerCase().replace('_', ' ')} with ~${attendance.toLocaleString()} attendees at ${data.venueName}. Significant demand for VIP speaker airport transfers, executive group vans (Mercedes V-Class), and punctual delegate transit.`;

    const recommendedServices = isSporting
      ? ['Corporate Event & Conference Transfers', 'Group Transfers & Luxury People Movers', 'VIP & Luxury Private Transportation']
      : [
          'Corporate Event & Conference Transfers',
          'VIP & Luxury Private Transportation',
          'Group Transfers & Luxury People Movers',
        ];

    const outreachAngle = isSporting
      ? `Offering corporate box and sponsor match-day transfers, plus group shuttles for ${data.name}.`
      : isPerformance
      ? `Offering VIP guest transfers and group shuttles for ${data.name}.`
      : `Offering dedicated VIP speaker airport arrivals with flight tracking and luxury Mercedes V-Class group shuttles for ${data.name} organizers.`;

    const summary = `${data.name} is a ${data.eventType.toLowerCase().replace('_', ' ')} hosted at ${data.venueName} in ${city}. Expected attendance of ~${attendance.toLocaleString()} ${attendeeNoun} creates transport logistics opportunities${isCommunity ? ', though scale is modest' : ''}.`;

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
