import { NextRequest, NextResponse } from 'next/server';
import { EmailDispatcher, SmtpConfig } from '@/lib/email/dispatcher';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { providerType, brevoApiKey, resendApiKey, host, port, user, pass, fromEmail, fromName, testRecipient } = body;

    if (!testRecipient) {
      return NextResponse.json(
        { success: false, error: 'Test Recipient email is required.' },
        { status: 400 }
      );
    }

    if (providerType === 'BREVO_API' && !brevoApiKey) {
      return NextResponse.json(
        { success: false, error: 'Brevo API Key is required when using Brevo REST API.' },
        { status: 400 }
      );
    }

    if (providerType === 'SMTP' && (!host || !user || !pass)) {
      return NextResponse.json(
        { success: false, error: 'Host, Username, and Password are required for SMTP.' },
        { status: 400 }
      );
    }

    const config: SmtpConfig = {
      providerType: providerType || (brevoApiKey ? 'BREVO_API' : 'SMTP'),
      brevoApiKey: brevoApiKey?.trim(),
      resendApiKey: resendApiKey?.trim(),
      host: host ? host.trim() : 'smtp.gmail.com',
      port: Number(port) || 465,
      secure: Number(port) === 465,
      user: user ? user.trim() : '',
      pass: pass ? pass.trim() : '',
      fromEmail: (fromEmail || 'book@opalchauffeurs.com.au').trim(),
      fromName: (fromName || 'Inaya | Opal Chauffeurs').trim(),
    };

    const result = await EmailDispatcher.testConnection(config, testRecipient.trim());

    if (result.success) {
      await logActivity({
        action: 'EMAIL_SENT',
        entityType: 'SETTING',
        actor: 'ADMIN_USER',
        description: `Tested email dispatch configuration (${config.providerType}) for ${config.fromEmail}. Verification email sent to ${testRecipient}.`,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error testing email connection:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal error testing email dispatch' }, { status: 500 });
  }
}
