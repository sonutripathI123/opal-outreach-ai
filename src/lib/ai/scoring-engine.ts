import { ScoreBreakdown, PriorityLevel } from '@/types';

export interface CompanyScoringInput {
  approximateSize: string;
  employeeCountEstimate?: number | null;
  officeCount: number;
  city: string;
  corporateActivityLevel: string; // HIGH, MEDIUM, LOW
  executiveTravelLikelihood: string; // HIGH, MEDIUM, LOW
  eventHostingLikelihood: string; // HIGH, MEDIUM, LOW
  isClientFacing: boolean;
  internationalPresence: boolean;
  isVerified: boolean;
}

export interface EventScoringInput {
  expectedAttendance?: number | null;
  vipPresenceLikelihood: string; // HIGH, MEDIUM, LOW
  city: string;
  eventType: string;
  daysUntilEvent: number;
}

export class ScoringEngine {
  /**
   * Transparent 0-100 Corporate Opportunity Scoring Model
   * Size (20) + Location (15) + Travel Demand (20) + Exec Activity (15) + Events/VIP (15) + Service Match (10) + Verification (5)
   */
  static calculateCompanyScore(
    input: CompanyScoringInput,
    customWeights?: Record<string, number>
  ): { score: number; priority: PriorityLevel; breakdown: ScoreBreakdown; reasoning: string } {
    const w = {
      size: customWeights?.companySize || 20,
      location: customWeights?.locationRelevance || 15,
      travel: customWeights?.travelDemand || 20,
      executive: customWeights?.executiveActivity || 15,
      events: customWeights?.eventsVipActivity || 15,
      service: customWeights?.serviceMatch || 10,
      verification: customWeights?.businessVerification || 5,
    };

    let sizeScore = 8;
    if (input.approximateSize.includes('Enterprise') || (input.employeeCountEstimate && input.employeeCountEstimate > 1000)) {
      sizeScore = w.size;
    } else if (input.approximateSize.includes('Large') || (input.employeeCountEstimate && input.employeeCountEstimate >= 200)) {
      sizeScore = Math.round(w.size * 0.85);
    } else if (input.approximateSize.includes('Medium') || (input.employeeCountEstimate && input.employeeCountEstimate >= 50)) {
      sizeScore = Math.round(w.size * 0.7);
    } else {
      sizeScore = Math.round(w.size * 0.4);
    }

    let locationScore = 6;
    if (input.city.toLowerCase() === 'melbourne') {
      locationScore = w.location; // Primary active city
    } else if (['sydney', 'brisbane', 'perth', 'adelaide'].includes(input.city.toLowerCase())) {
      locationScore = Math.round(w.location * 0.8);
    } else {
      locationScore = Math.round(w.location * 0.4);
    }

    let travelScore = 8;
    if (input.executiveTravelLikelihood === 'HIGH' || input.officeCount >= 3 || input.internationalPresence) {
      travelScore = w.travel;
    } else if (input.executiveTravelLikelihood === 'MEDIUM' || input.officeCount >= 2) {
      travelScore = Math.round(w.travel * 0.7);
    } else {
      travelScore = Math.round(w.travel * 0.35);
    }

    let executiveScore = 6;
    if (input.corporateActivityLevel === 'HIGH') {
      executiveScore = w.executive;
    } else if (input.corporateActivityLevel === 'MEDIUM') {
      executiveScore = Math.round(w.executive * 0.7);
    } else {
      executiveScore = Math.round(w.executive * 0.4);
    }

    let eventsScore = 5;
    if (input.eventHostingLikelihood === 'HIGH') {
      eventsScore = w.events;
    } else if (input.eventHostingLikelihood === 'MEDIUM') {
      eventsScore = Math.round(w.events * 0.7);
    } else {
      eventsScore = Math.round(w.events * 0.35);
    }

    let serviceScore = input.isClientFacing ? w.service : Math.round(w.service * 0.6);
    let verificationScore = input.isVerified ? w.verification : Math.round(w.verification * 0.5);

    const total = sizeScore + locationScore + travelScore + executiveScore + eventsScore + serviceScore + verificationScore;
    const finalScore = Math.min(100, Math.max(0, parseFloat(total.toFixed(1))));

    let priority: PriorityLevel = 'LOW';
    if (finalScore >= 80) priority = 'HIGH';
    else if (finalScore >= 60) priority = 'MEDIUM';
    else if (finalScore >= 40) priority = 'MANUAL_REVIEW';

    const reasoning = `Scored ${finalScore}/100 based on ${input.approximateSize} scale (${sizeScore}/${w.size} pts), ${input.city} location alignment (${locationScore}/${w.location} pts), corporate travel mobility (${travelScore}/${w.travel} pts), executive activity (${executiveScore}/${w.executive} pts), and event hospitality demand (${eventsScore}/${w.events} pts).`;

    return {
      score: finalScore,
      priority,
      breakdown: {
        companySize: sizeScore,
        locationRelevance: locationScore,
        travelDemand: travelScore,
        executiveActivity: executiveScore,
        eventsVipActivity: eventsScore,
        serviceMatch: serviceScore,
        businessVerification: verificationScore,
      },
      reasoning,
    };
  }

  /**
   * Transparent 0-100 Event Opportunity Scoring Model
   * Event Size (20) + Transport Demand (25) + VIP Relevance (15) + Group Potential (15) + Location Match (10) + Event Type (10) + Urgency (5)
   */
  static calculateEventScore(
    input: EventScoringInput,
    customWeights?: Record<string, number>
  ): { score: number; priority: PriorityLevel; breakdown: ScoreBreakdown; reasoning: string } {
    const w = {
      size: customWeights?.eventSize || 20,
      transport: customWeights?.transportDemand || 25,
      vip: customWeights?.vipRelevance || 15,
      group: customWeights?.groupTransferPotential || 15,
      location: customWeights?.locationMatch || 10,
      type: customWeights?.eventTypeMatch || 10,
      urgency: customWeights?.timingUrgency || 5,
    };

    let sizeScore = 10;
    const att = input.expectedAttendance || 500;
    if (att >= 2000) sizeScore = w.size;
    else if (att >= 800) sizeScore = Math.round(w.size * 0.85);
    else if (att >= 300) sizeScore = Math.round(w.size * 0.7);
    else sizeScore = Math.round(w.size * 0.45);

    let transportScore = 12;
    if (input.vipPresenceLikelihood === 'HIGH' && att >= 500) {
      transportScore = w.transport;
    } else if (input.vipPresenceLikelihood === 'MEDIUM') {
      transportScore = Math.round(w.transport * 0.7);
    } else {
      transportScore = Math.round(w.transport * 0.4);
    }

    let vipScore = input.vipPresenceLikelihood === 'HIGH' ? w.vip : input.vipPresenceLikelihood === 'MEDIUM' ? Math.round(w.vip * 0.7) : Math.round(w.vip * 0.3);
    let groupScore = att >= 500 ? w.group : Math.round(w.group * 0.6);
    let locationScore = input.city.toLowerCase() === 'melbourne' ? w.location : Math.round(w.location * 0.7);

    const highValueTypes = ['CONFERENCE', 'CORPORATE_SUMMIT', 'TRADE_SHOW', 'EXHIBITION', 'GALA_DINNER', 'VIP_GATHERING'];
    let typeScore = highValueTypes.includes(input.eventType) ? w.type : Math.round(w.type * 0.6);

    let urgencyScore = 3;
    if (input.daysUntilEvent >= 10 && input.daysUntilEvent <= 60) {
      urgencyScore = w.urgency; // Optimal outreach window
    } else if (input.daysUntilEvent <= 90) {
      urgencyScore = Math.round(w.urgency * 0.8);
    } else {
      urgencyScore = Math.round(w.urgency * 0.4);
    }

    const total = sizeScore + transportScore + vipScore + groupScore + locationScore + typeScore + urgencyScore;
    const finalScore = Math.min(100, Math.max(0, parseFloat(total.toFixed(1))));

    let priority: PriorityLevel = 'LOW';
    if (finalScore >= 80) priority = 'HIGH';
    else if (finalScore >= 60) priority = 'MEDIUM';
    else if (finalScore >= 40) priority = 'MANUAL_REVIEW';

    const reasoning = `Scored ${finalScore}/100 based on event scale of ~${att} delegates (${sizeScore}/${w.size} pts), strong transportation logistics demand (${transportScore}/${w.transport} pts), VIP executive presence (${vipScore}/${w.vip} pts), and prime ${input.city} location (${locationScore}/${w.location} pts).`;

    return {
      score: finalScore,
      priority,
      breakdown: {
        eventSize: sizeScore,
        transportDemand: transportScore,
        vipRelevance: vipScore,
        groupTransferPotential: groupScore,
        locationMatch: locationScore,
        eventTypeMatch: typeScore,
        timingUrgency: urgencyScore,
      },
      reasoning,
    };
  }
}
