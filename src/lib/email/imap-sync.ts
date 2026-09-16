import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/lib/prisma';
import { ReplyAnalyzer } from '@/lib/ai/reply-analyzer';
import { logActivity, createNotification } from '@/lib/activity-logger';

// Real replies come back as raw MIME source (quoted-printable/base64
// encoded, multipart, with the whole original outreach email quoted
// below the new text) — cuts off at the first line that looks like the
// start of that quoted history, so only the prospect's actual new
// message is kept. Covers the reply-quote conventions used by Gmail,
// Outlook, Apple Mail and Yahoo (the overwhelming majority of real
// inboxes), matching the same style of heuristic long-established
// reply-parsing libraries (e.g. GitHub's talon, email-reply-parser) use.
function stripQuotedReply(text: string): string {
  const lines = text.split(/\r?\n/);
  let cutIndex = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const looksLikeQuoteHeader =
      /^on .{5,160}\swrote:\s*$/i.test(line) ||
      /^-{2,}\s*original message\s*-{2,}/i.test(line) ||
      /^-{2,}\s*forwarded message\s*-{2,}/i.test(line) ||
      /^from:\s?.+@.+$/i.test(line) ||
      line.startsWith('>');

    if (looksLikeQuoteHeader) {
      cutIndex = i;
      break;
    }
  }

  return lines.slice(0, cutIndex).join('\n').trim();
}

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

    let stage = 'connect';
    try {
      await client.connect();

      // Open INBOX in read-only mode
      stage = 'open-mailbox';
      const lock = await client.getMailboxLock('INBOX');

      try {
        stage = 'search';
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

        // Search for recent messages in the last 7 days.
        // ImapFlow's fetch() takes a sequence/UID range, not a search query —
        // so we search() first for matching UIDs, then fetch those.
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 7);

        const uids = await client.search({ since: sinceDate }, { uid: true });
        const uidList = Array.isArray(uids) ? uids : [];

        stage = 'fetch';
        for await (const message of uidList.length > 0
          ? client.fetch(uidList, { envelope: true, source: true }, { uid: true })
          : []) {
          const fromAddress = message.envelope?.from?.[0]?.address?.toLowerCase()?.trim();
          if (!fromAddress) continue;

          // Check if this sender matches one of our sent outreach recipients
          const matchedSent = prospectEmailMap.get(fromAddress);
          if (!matchedSent) continue;

          // Check if this exact message was already synced. The subject
          // stays the same ("Re: ...") across every reply in a thread, so
          // matching on {sentEmailId, senderEmail, subject} treated a
          // prospect's second, third, etc. reply as a duplicate of their
          // first and silently dropped it. The email's real Message-ID
          // header is the one thing guaranteed unique per message; UID is
          // a same-mailbox fallback for the rare message lacking one.
          const messageSubject = message.envelope?.subject || 'Re: Corporate Chauffeur Inquiry';
          const messageIdKey = message.envelope?.messageId || `uid:${message.uid}`;
          const existingReply = await prisma.reply.findFirst({
            where: { messageId: messageIdKey },
          });

          if (existingReply) continue;

          // Extract the actual new reply text. A hand-rolled regex over the
          // raw MIME source used to be used here — it never decoded
          // quoted-printable/base64 encoding (leaving literal "=E2=80=AF",
          // "=C2=B7" etc. in the stored text) and often grabbed MIME part
          // headers (Content-Type, Content-Transfer-Encoding) as if they
          // were body text, on top of including the entire quoted original
          // outreach email below the prospect's real reply. mailparser
          // properly parses MIME (any encoding/charset) into clean text;
          // stripQuotedReply then cuts off the quoted history so only the
          // prospect's own new words are kept.
          let rawBody = '';
          if (message.source) {
            try {
              const parsed = await simpleParser(message.source);
              const plain = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]*>/g, ' ') : '') || '';
              rawBody = stripQuotedReply(plain).substring(0, 1500);
            } catch (parseErr) {
              console.warn('Failed to parse reply MIME source, falling back to subject:', parseErr);
            }
          }

          if (!rawBody || rawBody.trim() === '') {
            rawBody = message.envelope?.subject || 'Client replied to outreach inquiry.';
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
              messageId: messageIdKey,
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
      // ImapFlow errors carry extra detail (the raw server response, the
      // failing command, an error code) that the generic .message ("Command
      // failed") hides. Surface as much of it as we have so this is
      // diagnosable from the API response alone, without server log access.
      const detailParts = [
        err.message,
        err.response ? `server: ${err.response}` : null,
        err.responseText ? `server: ${err.responseText}` : null,
        err.command ? `command: ${err.command}` : null,
        err.code ? `code: ${err.code}` : null,
      ].filter(Boolean);
      const detail = detailParts.length > 0 ? detailParts.join(' | ') : 'Failed to sync with Zoho IMAP server.';
      return {
        success: false,
        syncedCount,
        messages: syncedResults,
        error: `[stage: ${stage}] ${detail}`,
      };
    }
  }
}
