import { NextRequest, NextResponse } from 'next/server';
import { EmailDispatcher, SmtpConfig } from '@/lib/email/dispatcher';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, user, pass, fromEmail, fromName, testRecipient } = body;

    if (!host || !user || !pass || !testRecipient) {
      return NextResponse.json(
        { success: false, error: 'Host, Username, Password/App Password, and Test Recipient are required.' },
        { status: 400 }
      );
    }

    const config: SmtpConfig = {
      host: host.trim(),
      port: Number(port) || 465,
      secure: Number(port) === 465,
      user: user.trim(),
      pass: pass.trim(),
      fromEmail: (fromEmail || 'book@opalchauffeurs.com.au').trim(),
      fromName: (fromName || 'Opal Chauffeurs Corporate Team').trim(),
    };

    const result = await EmailDispatcher.testConnection(config, testRecipient.trim());

    if (result.success) {
      await logActivity({
        action: 'EMAIL_SENT',
        entityType: 'SETTING',
        actor: 'ADMIN_USER',
        description: `Tested SMTP delivery configuration via ${config.host} for ${config.fromEmail}. Verification email sent to ${testRecipient}.`,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error testing SMTP connection:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal error testing SMTP' }, { status: 500 });
  }
}
