import { CorporateIntelligenceEngine, CompanyCandidateInput } from './corporate';
import { EventIntelligenceEngine, EventCandidateInput } from './events';
import { EmailGenerator, EmailGenerationParams } from './email-generator';
import { ReplyAnalyzer } from './reply-analyzer';
import { ScoringEngine } from './scoring-engine';

export class AITaskRouter {
  /**
   * Corporate Research & Opportunity Scoring
   */
  static async analyzeCompany(data: CompanyCandidateInput, customWeights?: Record<string, number>) {
    return CorporateIntelligenceEngine.analyzeCompany(data, customWeights);
  }

  /**
   * Event Intelligence & Transportation Scoring
   */
  static async analyzeEvent(data: EventCandidateInput, customWeights?: Record<string, number>) {
    return EventIntelligenceEngine.analyzeEvent(data, customWeights);
  }

  /**
   * Generate 2-Layer Personalized Outreach Draft
   */
  static async generateEmailDraft(params: EmailGenerationParams) {
    return EmailGenerator.generateEmail(params);
  }

  /**
   * Analyze Incoming Reply & Suggest Response
   */
  static async analyzeReply(replyText: string, context?: { companyName?: string; contactName?: string }) {
    return ReplyAnalyzer.analyze(replyText, context);
  }
}
