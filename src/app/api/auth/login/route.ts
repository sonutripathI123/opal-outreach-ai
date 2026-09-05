import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signToken, TOKEN_NAME } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

function issueSession(payload: { userId: string; email: string; name: string; role: string }) {
  const token = signToken(payload);
  const response = NextResponse.json({
    success: true,
    user: { id: payload.userId, email: payload.email, name: payload.name, role: payload.role },
  });
  response.cookies.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return response;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Env-driven bootstrap admin: only usable BEFORE a matching DB user exists,
    // and only when ADMIN_EMAIL / ADMIN_PASSWORD are configured as environment secrets.
    // (No passwords are hardcoded in source anymore.)
    if (!user) {
      const bootstrapEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
      const bootstrapPassword = process.env.ADMIN_PASSWORD;
      if (
        bootstrapEmail &&
        bootstrapPassword &&
        cleanEmail === bootstrapEmail &&
        password === bootstrapPassword
      ) {
        return issueSession({
          userId: 'admin-bootstrap',
          email: cleanEmail,
          name: 'Administrator',
          role: 'ADMIN',
        });
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Normal path: verify against the bcrypt hash stored in the database.
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await logActivity({
      action: 'SETTING_UPDATED',
      entityType: 'SETTING',
      actor: 'ADMIN_USER',
      description: `User ${user.email} logged into Opal Outreach AI dashboard.`,
    });

    return issueSession({ userId: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
