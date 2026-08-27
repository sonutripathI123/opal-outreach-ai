export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'MANUAL_REVIEW' | 'LOW';

export type CompanyStatus =
  | 'DISCOVERED'
  | 'RESEARCHED'
  | 'QUALIFIED'
  | 'DRAFTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'CONTACTED'
  | 'REPLIED'
  | 'DO_NOT_CONTACT'
  | 'REJECTED';

export type EventStatus =
  | 'DISCOVERED'
  | 'RESEARCHED'
  | 'QUALIFIED'
  | 'DRAFTED'
  | 'APPROVED'
  | 'CONTACTED'
  | 'COMPLETED'
  | 'IGNORED';

export type DraftStatus = 'DRAFT' | 'READY_FOR_REVIEW' | 'APPROVED' | 'REJECTED' | 'SENT';

export type RejectionReason =
  | 'NOT_RELEVANT'
  | 'WRONG_CONTACT'
  | 'EMAIL_QUALITY_ISSUE'
  | 'ALREADY_CONTACTED'
  | 'COMPANY_NOT_SUITABLE'
  | 'OTHER';

export type ReplyIntent =
  | 'INTERESTED'
  | 'MEETING_REQUEST'
  | 'MORE_INFO_REQUESTED'
  | 'PRICING_REQUESTED'
  | 'FOLLOW_UP_REQUIRED'
  | 'NOT_INTERESTED'
  | 'UNCLEAR'
  | 'OTHER';

export interface ScoreBreakdown {
  companySize?: number;
  locationRelevance?: number;
  travelDemand?: number;
  executiveActivity?: number;
  eventsVipActivity?: number;
  serviceMatch?: number;
  businessVerification?: number;
  eventSize?: number;
  transportDemand?: number;
  vipRelevance?: number;
  groupTransferPotential?: number;
  locationMatch?: number;
  eventTypeMatch?: number;
  timingUrgency?: number;
}

export interface ResearchSignals {
  strong: string[];
  medium: string[];
  weak: string[];
}

export interface EvidenceSource {
  title: string;
  url: string;
  snippet: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
}
