import nodemailer from 'nodemailer';
import dns from 'dns';
import { prisma } from '@/lib/prisma';

// Force Node.js to prioritize IPv4 DNS lookups on cloud environments (fixes Render ENETUNREACH IPv6 bug)
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  console.warn('Could not set dns default result order:', e);
}

export interface EmailSendOptions {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export class EmailDispatcher {
  /**
   * Creates an optimized Nodemailer transporter with strict IPv4 routing & auto space-stripping
   */
  static createTransporter(config: SmtpConfig) {
    const cleanUser = (config.user || '').trim();
    const cleanPass = (config.pass || '').replace(/\s+/g, ''); // Auto-remove spaces from Google App Passwords
    const cleanHost = (config.host || '').trim();
    const isGmail =
      cleanHost.toLowerCase().includes('gmail') ||
      cleanUser.toLowerCase().endsWith('@gmail.com');

    const host = isGmail ? 'smtp.gmail.com' : cleanHost;
    const port = Number(config.port) || 465;
    const secure = config.secure !== undefined ? Boolean(config.secure) : (port === 465);

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      family: 4, // STRICT IPV4: Prevents Render ENETUNREACH on IPv6
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    } as any);
  }

  /**
   * Retrieves active SMTP configuration from database or env variables
   */
  static async getSmtpConfig(): Promise<SmtpConfig | null> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: 'smtp_config' },
      });

      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        if (parsed.host && parsed.user && parsed.pass) {
          return {
            host: parsed.host,
            port: Number(parsed.port) || 465,
            secure: parsed.secure !== undefined ? Boolean(parsed.secure) : (Number(parsed.port) === 465),
            user: parsed.user,
            pass: parsed.pass,
            fromEmail: parsed.fromEmail || 'book@opalchauffeurs.com.au',
            fromName: parsed.fromName || 'Opal Chauffeurs Corporate Team',
          };
        }
      }
    } catch (e) {
      console.warn('Error reading SMTP config from database:', e);
    }

    // Fallback to process.env
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const port = Number(process.env.SMTP_PORT) || 465;
      return {
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        fromEmail: process.env.SMTP_FROM || 'book@opalchauffeurs.com.au',
        fromName: process.env.SMTP_FROM_NAME || 'Opal Chauffeurs Corporate Team',
      };
    }

    return null;
  }

  /**
   * Dispatches an email via configured SMTP with instant IPv4 connection
   */
  static async sendEmail(options: EmailSendOptions): Promise<{
    success: boolean;
    messageId?: string;
    mode: 'REAL_SMTP' | 'SIMULATED_SAFE';
    error?: string;
  }> {
    const config = await this.getSmtpConfig();

    if (!config) {
      console.log(`[SIMULATED DISPATCH] No SMTP credentials configured. Recorded email to: ${options.to}`);
      return {
        success: true,
        mode: 'SIMULATED_SAFE',
        messageId: `sim-${Date.now()}`,
      };
    }

    try {
      const transporter = this.createTransporter(config);

      const formattedFrom = `"${config.fromName}" <${config.fromEmail}>`;
      const formattedTo = options.toName ? `"${options.toName}" <${options.to}>` : options.to;

      const result = await transporter.sendMail({
        from: formattedFrom,
        to: formattedTo,
        replyTo: options.replyTo || config.fromEmail,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text.replace(/\n/g, '<br/>'),
      });

      return {
        success: true,
        mode: 'REAL_SMTP',
        messageId: result.messageId,
      };
    } catch (err: any) {
      console.error('SMTP Dispatch Error:', err);
      return {
        success: false,
        mode: 'REAL_SMTP',
        error: err.message || 'SMTP transmission error',
      };
    }
  }

  /**
   * Verifies SMTP connection and sends a test email
   */
  static async testConnection(
    config: SmtpConfig,
    testRecipient: string
  ): Promise<{ success: boolean; message: string; messageId?: string }> {
    try {
      const transporter = this.createTransporter(config);

      await transporter.verify();

      const testResult = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: testRecipient,
        subject: '✨ Opal Outreach AI - Real Email Delivery Test Successful',
        text: `Hello,\n\nThis is a verification test from Opal Outreach AI.\n\nYour outgoing email configuration for ${config.fromEmail} is 100% operational!\n\nWarm regards,\nInaya\nOpal Chauffeurs Intelligence Team`,
      });

      return {
        success: true,
        message: `Test email dispatched successfully to ${testRecipient}!`,
        messageId: testResult.messageId,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to authenticate with SMTP server. Please verify your App Password or port.',
      };
    }
  }
}
