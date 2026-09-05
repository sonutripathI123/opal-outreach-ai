import { NextRequest, NextResponse } from 'next/server';

/**
 * Global authentication gate.
 *
 * Every dashboard page and every /api/* route requires a valid signed session
 * cookie, EXCEPT the small allow-list below (login, logout, the auth probe,
 * the public inbound-email webhook, and the health check).
 *
 * JWTs are signed with `jsonwebtoken` (HS256) in src/lib/auth.ts. We verify the
 * signature here using the Web Crypto API so the check is compatible with the
 * Edge runtime that Next.js middleware runs in.
 */

const TOKEN_NAME = 'opal_auth_token';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/replies/webhook', // external email providers post here; guarded by its own optional secret
  '/healthz',
];

function base64UrlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyJwt(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret) as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signatureB64) as BufferSource,
      new TextEncoder().encode(`${headerB64}.${payloadB64}`) as BufferSource
    );
    if (!valid) return false;

    // Reject expired tokens.
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64) as BufferSource));
    if (payload.exp && Date.now() / 1000 > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(TOKEN_NAME)?.value;
  const secret = process.env.JWT_SECRET;

  // If no secret is configured we cannot trust any token — fail closed.
  const authenticated = token && secret ? await verifyJwt(token, secret) : false;

  if (authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next.js internals and static asset files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|txt|woff|woff2|ttf|map)$).*)',
  ],
};
