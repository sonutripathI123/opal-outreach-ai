import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword, verifyPassword, signToken, TOKEN_NAME } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

/**
 * Changes the signed-in admin's login email and/or password. Until this is
 * called once, login runs on the ADMIN_EMAIL/ADMIN_PASSWORD env-var
 * bootstrap (see /api/auth/login) with no real User row in the database —
 * this route creates that first real row the first time it's used, and
 * from then on updates it directly.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { currentPassword, newEmail, newPassword } = await req.json();

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required to make this change' }, { status: 400 });
    }
    if (!newEmail && !newPassword) {
      return NextResponse.json({ error: 'Provide a new email and/or a new password' }, { status: 400 });
    }
    if (newPassword && newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const isBootstrapAdmin = session.userId === 'admin-bootstrap';
    let existingUser = isBootstrapAdmin
      ? null
      : await prisma.user.findUnique({ where: { id: session.userId } });

    // Verify the current password against whichever credential is actually
    // active right now — the env-var bootstrap pair, or the DB user's hash.
    if (isBootstrapAdmin) {
      if (currentPassword !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
    } else {
      if (!existingUser) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      const valid = await verifyPassword(currentPassword, existingUser.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
    }

    const finalEmail = (newEmail || session.email).toLowerCase().trim();
    // Keep the current password (re-hashed) when only the email is being
    // changed — currentPassword was just verified above, so it's safe.
    const finalPasswordHash = await hashPassword(newPassword || currentPassword);

    let updatedUser;
    try {
      if (isBootstrapAdmin) {
        updatedUser = await prisma.user.create({
          data: {
            email: finalEmail,
            name: session.name,
            passwordHash: finalPasswordHash,
            role: session.role,
          },
        });
      } else {
        updatedUser = await prisma.user.update({
          where: { id: session.userId },
          data: { email: finalEmail, passwordHash: finalPasswordHash },
        });
      }
    } catch (err: any) {
      if (err.code === 'P2002') {
        return NextResponse.json({ error: `Email ${finalEmail} is already in use` }, { status: 409 });
      }
      throw err;
    }

    await logActivity({
      action: 'SETTING_UPDATED',
      entityType: 'SETTING',
      actor: 'ADMIN_USER',
      description: `Login credentials updated${newEmail ? ` (email changed to ${finalEmail})` : ''}${newPassword ? ' (password changed)' : ''}.`,
    });

    // Re-issue the session so the new email takes effect immediately
    // without forcing a fresh login.
    const token = signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
    });
    const response = NextResponse.json({
      success: true,
      user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role },
    });
    response.cookies.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('Error updating login credentials:', error);
    return NextResponse.json({ error: error.message || 'Failed to update login credentials' }, { status: 500 });
  }
}
