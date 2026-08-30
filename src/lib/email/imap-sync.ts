import { ImapFlow } from 'imapflow';
import { prisma } from '@/lib/prisma';
import { ReplyAnalyzer } from '@/lib/ai/reply-analyzer';
import { logActivity, createNotification } from '@/lib/activity-logger';

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export class ZohoImapSyncEngine {
  /**
   * Retrieves active IMAP config from database or environment
   */
  static async getImapConfig(): Promise<ImapConfig | null> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: 'imap_config' },
      });

      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        if (parsed.user && parsed.pass) {
          return {
            host: parsed.host || 'imappro.zoho.com',
            port: Number(parsed.port) || 993,
            secure: parsed.secure !== undefined ? Boolean(parsed.secure) : true,
            user: parsed.user,
            pass: parsed.pass,
          };
        }
      }
    } catch (err) {
      console.warn('Error fetching IMAP config from DB:', err);
    }

    if (process.env.IMAP_USER && process.env.IMAP_PASS) {
      return {
        host: process.env.IMAP_HOST || 'imappro.zoho.com',
        port: Number(process.env.IMAP_PORT) || 993,
        secure: true,
        user: process.env.IMAP_USER,
        pass: process.env.IMAP_PASS,
      };
    }

    return null;
  }

  /**
   * Connects to Zoho Mail via IMAP, pulls new inbound prospect replies,
   * classifies intent with AI, updates the database, and halts follow-ups.
   */
  static async syncInboundReplies(): Promise<{
    success: boolean;
    syncedCount: number;
    messages: string[];
    error?: string;
  }> {
    const config = await this.getImapConfig();
    if (!config) {
      return {
        success: false,
        syncedCount: 0,
        messages: [],
        error: 'Zoho IMAP credentials not configured in /settings or Environment Variables.',
      };
    }

    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      logger: false,
    });

    const syncedResults: string[] = [];
    let syncedCount = 0;

    try {
      await client.connect();

      // Open INBOX in read-only mode
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Fetch sent email addresses to match replies
        const sentEmails = await prisma.sentEmail.findMany({
          select: {
            id: true,
            recipientEmail: true,
            recipientName: true,
            subject: true,
            companyId: true,
            contactId: true,
            hasReply: true,
            company: { select: { name: true } },
            event: { select: { name: true } },
          },
        });

        const prospectEmailMap = new Map<string, typeof sentEmails[0]>();
        sentEmails.forEach((s) => {
          if (s.recipientEmail) {
            prospectEmailMap.set(s.recipientEmail.trim().toLowerCase(), s);
          }
        });

        // Search for recent messages in the last 7 days
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 7);

        const searchCriteria = {
          since: sinceDate,
        };

        for await (const message of client.fetch(searchCriteria, {
          envelope: true,
          source: true,
          bodyStructure: true,
        })) {
          const fromAddress = message.envelope?.from?.[0]?.address?.toLowerCase()?.trim();
          if (!fromAddress) continue;

          // Check if this sender matches one of our sent outreach recipients
          const matchedSent = prospectEmailMap.get(fromAddress);
          if (!matchedSent) continue;

          // Check if reply already exists in DB to prevent duplicates
          const messageSubject = message.envelope?.subject || 'Re: Corporate Chauffeur Inquiry';
          const existingReply = await prisma.reply.findFirst({
            where: {
              sentEmailId: matchedSent.id,
              senderEmail: fromAddress,
              subject: messageSubject,
            },
          });

          if (existingReply) continue;

          // Extract text snippet
          let rawBody = message.envelope?.subject || '';
          if (message.source) {
            const rawStr = message.source.toString('utf-8');
            // Basic text extraction from mime source
            const textMatch = rawStr.match(/\r?\n\r?\n([\s\S]+?)(?=\r?\n--|\r?\n\.\r?\n|$)/);
            if (textMatch && textMatch[1]) {
              rawBody = textMatch[1].replace(/<[^>]*>/g, '').trim().substring(0, 1500);
            }
          }

          if (!rawBody || rawBody.trim() === '') {
            rawBody = 'Client replied to outreach inquiry.';
          }

          const recipientDisplayName = matchedSent.recipientName || 'Corporate Prospect';
          const targetCompName = matchedSent.company?.name || matchedSent.event?.name || 'Corporate Partner';

          // AI Reply Analysis
          const analysis = ReplyAnalyzer.analyze(rawBody, {
            companyName: targetCompName,
            contactName: recipientDisplayName,
          });

          // Create Reply in DB
          const reply = await prisma.reply.create({
            data: {
              sentEmailId: matchedSent.id,
              companyId: matchedSent.companyId,
              contactId: matchedSent.contactId,
              senderEmail: fromAddress,
              subject: messageSubject,
              bodyText: rawBody,
              aiClassification: analysis.classification,
              aiExecutiveSummary: analysis.executiveSummary,
              aiDetectedIntent: analysis.detectedIntent,
              aiSuggestedAction: analysis.suggestedAction,
              aiDraftedReply: analysis.draftedReply,
              status: 'NEW',
            },
          });

          // Mark SentEmail as replied
          await prisma.sentEmail.update({
            where: { id: matchedSent.id },
            data: { hasReply: true },
          });

          if (matchedSent.companyId) {
            await prisma.company.update({
              where: { id: matchedSent.companyId },
              data: { status: 'REPLIED' },
            });
          }

          // Auto-cancel scheduled follow-ups
          await prisma.followUp.updateMany({
            where: {
              sentEmailId: matchedSent.id,
              status: 'SCHEDULED',
            },
            data: {
              status: 'CANCELLED',
              cancelReason: 'REPLY_RECEIVED',
            },
          });

          await logActivity({
            action: 'REPLY_RECEIVED',
            entityType: 'REPLY',
            entityId: reply.id,
            actor: 'AI_ENGINE',
            description: `Auto-synced inbound reply from ${recipientDisplayName} (${fromAddress}) via Zoho IMAP. Intent: ${analysis.classification}.`,
            details: {
              classification: analysis.classification,
              intent: analysis.detectedIntent,
            },
          });

          await createNotification({
            type: 'REPLY_RECEIVED',
            title: `New Reply Received: ${recipientDisplayName} (${analysis.classification})`,
            message: analysis.executiveSummary,
            linkUrl: '/sent',
          });

          syncedCount++;
          syncedResults.push(`Synced reply from ${recipientDisplayName} (${fromAddress})`);
        }
      } finally {
        lock.release();
      }

      await client.logout();
      return {
        success: true,
        syncedCount,
        messages: syncedResults,
      };
    } catch (err: any) {
      console.error('Zoho IMAP sync error:', err);
      try {
        await client.logout();
      } catch (_) {}
      return {
        success: false,
        syncedCount,
        messages: syncedResults,
        error: err.message || 'Failed to sync with Zoho IMAP server.',
      };
    }
  }
}
