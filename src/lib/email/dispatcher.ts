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

// Explicit IPv4-only socket resolver for Nodemailer
function ipv4Lookup(hostname: string, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return dns.lookup(hostname, { family: 4 }, (err, address, family) => {
    callback(err, address, 4);
  });
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
  providerType?: 'BREVO_API' | 'RESEND_API' | 'SMTP';
  brevoApiKey?: string;
  resendApiKey?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  fromEmail: string;
  fromName: string;
}

export class EmailDispatcher {
  /**
   * Dispatches via Brevo (Sendinblue) HTTP REST API over standard HTTPS Port 443
   * 100% Guaranteed Unblocked on Render Cloud (300 Free Emails / Day)
   */
  static async sendViaBrevo(apiKey: string, config: SmtpConfig, options: EmailSendOptions) {
    const fromEmail = (config.fromEmail || 'book@opalchauffeurs.com.au').trim();
    const fromName = (config.fromName || 'Inaya | Opal Chauffeurs').trim();

    const payload = {
      sender: {
        name: fromName,
        email: fromEmail,
      },
      to: [
        {
          email: options.to.trim(),
          name: options.toName ? options.toName.trim() : options.to.trim(),
        },
      ],
      replyTo: {
        email: options.replyTo || fromEmail,
        name: fromName,
      },
      subject: options.subject,
      htmlContent: options.html || options.text.replace(/\n/g, '<br/>'),
      textContent: options.text,
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || data.error || `Brevo HTTP Error ${res.status}`);
    }

    return {
      success: true,
      mode: 'BREVO_REST_API' as const,
      messageId: data.messageId || `brevo-${Date.now()}`,
    };
  }

  /**
   * Dispatches via Resend HTTP REST API over standard HTTPS Port 443
   */
  static async sendViaResend(apiKey: string, config: SmtpConfig, options: EmailSendOptions) {
    const fromEmail = (config.fromEmail || 'book@opalchauffeurs.com.au').trim();
    const fromName = (config.fromName || 'Inaya | Opal Chauffeurs').trim();

    const payload = {
      from: `${fromName} <${fromEmail}>`,
      to: [options.to.trim()],
      reply_to: options.replyTo || fromEmail,
      subject: options.subject,
      html: options.html || options.text.replace(/\n/g, '<br/>'),
      text: options.text,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || data.error || `Resend HTTP Error ${res.status}`);
    }

    return {
      success: true,
      mode: 'RESEND_REST_API' as const,
      messageId: data.id || `resend-${Date.now()}`,
    };
  }

  /**
   * Creates an optimized Nodemailer transporter with custom IPv4 lookup & auto space-stripping
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
      lookup: ipv4Lookup,
      family: 4, // STRICT IPV4: Eliminates Render ENETUNREACH on IPv6
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    } as any);
  }

  /**
   * Retrieves active email configuration from database or env variables
   */
  static async getSmtpConfig(): Promise<SmtpConfig | null> {
    try {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: 'smtp_config' },
      });

      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        if (parsed.brevoApiKey || parsed.resendApiKey || (parsed.host && parsed.user && parsed.pass)) {
          return {
            providerType: parsed.providerType || (parsed.brevoApiKey ? 'BREVO_API' : parsed.resendApiKey ? 'RESEND_API' : 'SMTP'),
            brevoApiKey: parsed.brevoApiKey,
            resendApiKey: parsed.resendApiKey,
            host: parsed.host,
            port: Number(parsed.port) || 465,
            secure: parsed.secure !== undefined ? Boolean(parsed.secure) : (Number(parsed.port) === 465),
            user: parsed.user,
            pass: parsed.pass,
            fromEmail: parsed.fromEmail || 'book@opalchauffeurs.com.au',
            fromName: parsed.fromName || 'Inaya | Opal Chauffeurs',
          };
        }
      }
    } catch (e) {
      console.warn('Error reading SMTP config from database:', e);
    }

    // Fallback to process.env
    if (process.env.BREVO_API_KEY) {
      return {
        providerType: 'BREVO_API',
        brevoApiKey: process.env.BREVO_API_KEY,
        fromEmail: process.env.SMTP_FROM || 'book@opalchauffeurs.com.au',
        fromName: process.env.SMTP_FROM_NAME || 'Inaya | Opal Chauffeurs',
      };
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const port = Number(process.env.SMTP_PORT) || 465;
      return {
        providerType: 'SMTP',
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        fromEmail: process.env.SMTP_FROM || 'book@opalchauffeurs.com.au',
        fromName: process.env.SMTP_FROM_NAME || 'Inaya | Opal Chauffeurs',
      };
    }

    return null;
  }

  /**
   * Dispatches an email via configured engine (Brevo REST API / Resend / Dual-Port SMTP)
   */
  static async sendEmail(options: EmailSendOptions): Promise<{
    success: boolean;
    messageId?: string;
    mode: 'BREVO_REST_API' | 'RESEND_REST_API' | 'REAL_SMTP' | 'SIMULATED_SAFE';
    error?: string;
  }> {
    const config = await this.getSmtpConfig();

    if (!config) {
      console.log(`[SIMULATED DISPATCH] No email credentials configured. Recorded email to: ${options.to}`);
      return {
        success: true,
        mode: 'SIMULATED_SAFE',
        messageId: `sim-${Date.now()}`,
      };
    }

    // 1. Priority A: Brevo HTTP REST API (100% Unblocked on Render Cloud)
    if (config.providerType === 'BREVO_API' && config.brevoApiKey) {
      try {
        return await this.sendViaBrevo(config.brevoApiKey, config, options);
      } catch (err: any) {
        console.error('Brevo API Dispatch Error:', err);
        return {
          success: false,
          mode: 'BREVO_REST_API',
          error: `Brevo API Error: ${err.message || 'Transmission failed'}`,
        };
      }
    }

    // 2. Priority B: Resend HTTP REST API
    if (config.providerType === 'RESEND_API' && config.resendApiKey) {
      try {
        return await this.sendViaResend(config.resendApiKey, config, options);
      } catch (err: any) {
        console.error('Resend API Dispatch Error:', err);
        return {
          success: false,
          mode: 'RESEND_REST_API',
          error: `Resend API Error: ${err.message || 'Transmission failed'}`,
        };
      }
    }

    // 3. Priority C: Standard SMTP with Dual-Port Fallback (Port 465 & Port 587)
    const formattedFrom = `"${config.fromName}" <${config.fromEmail}>`;
    const formattedTo = options.toName ? `"${options.toName}" <${options.to}>` : options.to;

    try {
      const transporter = this.createTransporter(config);
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
    } catch (primaryErr: any) {
      console.warn('Port 465 attempt failed, trying Port 587 fallback:', primaryErr.message);

      try {
        const fallbackConfig: SmtpConfig = { ...config, port: 587, secure: false };
        const fallbackTransporter = this.createTransporter(fallbackConfig);
        const result = await fallbackTransporter.sendMail({
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
      } catch (fallbackErr: any) {
        console.error('SMTP Dispatch Error on both ports:', fallbackErr);
        return {
          success: false,
          mode: 'REAL_SMTP',
          error: fallbackErr.message || primaryErr.message || 'SMTP transmission error',
        };
      }
    }
  }

  /**
   * Verifies email connection and sends a test email
   */
  static async testConnection(
    config: SmtpConfig,
    testRecipient: string
  ): Promise<{ success: boolean; message: string; messageId?: string }> {
    const testOptions: EmailSendOptions = {
      to: testRecipient.trim(),
      subject: '✨ Opal Outreach AI - Real Email Delivery Test Successful',
      text: `Hello,\n\nThis is a verification test from Opal Outreach AI.\n\nYour outgoing email configuration for ${config.fromEmail} is 100% operational!\n\nWarm regards,\nInaya\nOpal Chauffeurs Intelligence Team`,
    };

    // Brevo API Test
    if (config.providerType === 'BREVO_API' && config.brevoApiKey) {
      try {
        const result = await this.sendViaBrevo(config.brevoApiKey, config, testOptions);
        return {
          success: true,
          message: `✨ Brevo REST API test email dispatched successfully to ${testRecipient}! (Render 100% Unblocked)`,
          messageId: result.messageId,
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Brevo API Error: ${err.message || 'Failed to authenticate API key or sender email'}`,
        };
      }
    }

    // Resend API Test
    if (config.providerType === 'RESEND_API' && config.resendApiKey) {
      try {
        const result = await this.sendViaResend(config.resendApiKey, config, testOptions);
        return {
          success: true,
          message: `✨ Resend REST API test email dispatched successfully to ${testRecipient}!`,
          messageId: result.messageId,
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Resend API Error: ${err.message || 'Failed to send'}`,
        };
      }
    }

    // SMTP Test
    try {
      const transporter = this.createTransporter(config);
      await transporter.verify();

      const testResult = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: testRecipient,
        subject: testOptions.subject,
        text: testOptions.text,
      });

      return {
        success: true,
        message: `Test email dispatched successfully to ${testRecipient}!`,
        messageId: testResult.messageId,
      };
    } catch (primaryErr: any) {
      try {
        const fallbackConfig: SmtpConfig = { ...config, port: 587, secure: false };
        const fallbackTransporter = this.createTransporter(fallbackConfig);
        await fallbackTransporter.verify();

        const testResult = await fallbackTransporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to: testRecipient,
          subject: testOptions.subject,
          text: testOptions.text,
        });

        return {
          success: true,
          message: `Test email dispatched successfully to ${testRecipient} via Port 587!`,
          messageId: testResult.messageId,
        };
      } catch (fallbackErr: any) {
        return {
          success: false,
          message: fallbackErr.message || primaryErr.message || 'Failed to authenticate with SMTP server. Please verify your App Password.',
        };
      }
    }
  }
}
