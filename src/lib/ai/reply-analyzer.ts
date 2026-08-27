import { ReplyIntent } from '@/types';

export interface ReplyAnalysisResult {
  classification: ReplyIntent;
  executiveSummary: string;
  detectedIntent: string;
  suggestedAction: string;
  draftedReply: string;
}

export class ReplyAnalyzer {
  static analyze(replyText: string, context?: { companyName?: string; contactName?: string }): ReplyAnalysisResult {
    const text = replyText.toLowerCase();
    const contactName = context?.contactName?.split(' ')[0] || 'there';
    const companyName = context?.companyName || 'your team';

    if (text.includes('meeting') || text.includes('call') || text.includes('calendar') || text.includes('zoom') || text.includes('time to speak') || text.includes('available at')) {
      return {
        classification: 'MEETING_REQUEST',
        executiveSummary: 'Prospect is receptive and specifically requested a call/meeting to discuss corporate transport.',
        detectedIntent: 'Wants to schedule a 10-15 minute discussion or introductory call.',
        suggestedAction: 'Send booking link or confirm proposed time slots immediately.',
        draftedReply: `Hi ${contactName},

Thank you for your prompt response. I would be glad to coordinate a brief conversation.

I can make either of the following times work:
• Tomorrow at 10:30 AM or 2:00 PM AEST
• Friday at 11:00 AM AEST

Alternatively, please let me know a day and time that best suits your schedule, and I will send through a calendar invite.

Looking forward to speaking with you.

Warm regards,
Corporate Partnerships Team | Opal Chauffeurs`,
      };
    }

    if (text.includes('rate') || text.includes('price') || text.includes('pricing') || text.includes('quote') || text.includes('cost') || text.includes('card')) {
      return {
        classification: 'PRICING_REQUESTED',
        executiveSummary: 'Prospect requested corporate rates and pricing card for Opal Chauffeurs services.',
        detectedIntent: 'Reviewing transport budgets and seeking corporate rate overview for airport/executive transfers.',
        suggestedAction: 'Provide standard corporate rate sheet and highlight consolidated billing advantages.',
        draftedReply: `Hi ${contactName},

Thank you for reaching out. 

I have attached our current Opal Chauffeurs Corporate Rate Card, covering fixed-rate Melbourne Airport (Tullamarine & Avalon) transfers, hourly as-directed bookings, and our executive fleet tiers (Executive Sedans, Luxury SUVs, and Mercedes V-Class).

Our corporate accounts include centralized monthly invoicing, priority dispatch, and dedicated account support with zero setup fees.

Please let me know if you have specific frequent routes or upcoming itineraries you would like us to quote.

Warm regards,
Corporate Partnerships Team | Opal Chauffeurs`,
      };
    }

    if (text.includes('interested') || text.includes('send through') || text.includes('send info') || text.includes('more information') || text.includes('details')) {
      return {
        classification: 'MORE_INFO_REQUESTED',
        executiveSummary: 'Prospect expressed positive interest and asked for corporate service details.',
        detectedIntent: 'Gathering information to evaluate partnership for executive and client travel.',
        suggestedAction: 'Provide service overview and invite them to set up a corporate booking account.',
        draftedReply: `Hi ${contactName},

Thanks for getting in touch. 

Opal Chauffeurs provides comprehensive executive travel for leading Melbourne organizations. Our service highlights include:
• 24/7 Flight-Tracked Airport Transfers with meet-and-greet
• Pristine European luxury sedans and Mercedes V-Class people movers
• Seamless corporate booking portal with monthly statement billing

I would be delighted to activate a test booking or assist with your upcoming travel requirements.

Warm regards,
Corporate Partnerships Team | Opal Chauffeurs`,
      };
    }

    if (text.includes('unsubscribe') || text.includes('remove') || text.includes('not interested') || text.includes('no thanks') || text.includes('dont contact')) {
      return {
        classification: 'NOT_INTERESTED',
        executiveSummary: 'Prospect declined the outreach or requested removal from future communications.',
        detectedIntent: 'Opt-out / Not interested in corporate chauffeur services at this time.',
        suggestedAction: 'Mark contact and company as Do Not Contact and close outreach sequence.',
        draftedReply: `Hi ${contactName},

Thank you for letting us know. I have updated our records accordingly.

Wishing you and ${companyName} continued success.

Warm regards,
Corporate Partnerships Team | Opal Chauffeurs`,
      };
    }

    // Default / General
    return {
      classification: 'INTERESTED',
      executiveSummary: 'Inbound response received from prospect regarding Opal Chauffeurs outreach.',
      detectedIntent: 'Open to learning more about executive transportation support.',
      suggestedAction: 'Follow up with helpful corporate information and propose next steps.',
      draftedReply: `Hi ${contactName},

Thank you for your reply. 

We would be pleased to assist ${companyName} with reliable, luxury corporate transport in Melbourne and across Australia.

Please let us know how we can best support your upcoming executive travel or event transport needs.

Warm regards,
Corporate Partnerships Team | Opal Chauffeurs`,
    };
  }
}
