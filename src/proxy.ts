import { NextResponse, type NextRequest } from 'next/server';

import {
  AUTH_REQUIRED_MESSAGE,
  isAuthenticated,
} from '@/lib/security/guards';
import {
  evaluateOrigin,
  getExtraAllowedHosts,
  isAllowedHostHeader,
  isStateChangingMethod,
} from '@/lib/security/request-context';
import { requestScheme } from '@/lib/security/trusted-proxy';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — REQUEST PROXY
 * =========================================================
 *
 * Next.js 16 `proxy.ts` (the file convention that replaced
 * `middleware.ts`). It runs before every matched request and
 * applies four things:
 *
 * 1. HOST VALIDATION. A request whose `Host` header names
 *    anything other than a local address is refused with
 *    421. This closes the DNS-rebinding path, where an
 *    attacker points their own name at 127.0.0.1 and the
 *    browser then treats their site as same-origin.
 *
 * 2. ORIGIN VALIDATION. A state-changing request whose
 *    `Origin` is not this application's own origin is
 *    refused with 403. `Sec-Fetch-Site: cross-site` is
 *    refused for the same reason.
 *
 * 3. SECURITY RESPONSE HEADERS. Added to every response.
 *
 * 4. A SESSION GATE. Pages redirect to /login and API routes
 *    are rejected with 401 when the request does not carry a
 *    VALID session — the signature is checked here, so a
 *    cookie that merely exists does not open anything. This
 *    is one layer, not the whole boundary: the cryptographic
 *    check also runs in every route handler
 *    (`src/lib/security/guards.ts`), so authorization never
 *    depends on this file alone.
 */

/** Pages that must be reachable without a session. */
const PUBLIC_PAGES = new Set(['/login']);

/** API routes that must be reachable without a session. */
const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/session',
  '/api/auth/logout',
]);

function contentSecurityPolicy(): string {
  // The stylesheet imports the DM Sans / IBM Plex Mono webfonts
  // from Google Fonts, so those two origins have to be named
  // explicitly. Everything else stays on 'self'.
  const fontStyleOrigin = 'https://fonts.googleapis.com';
  const fontFileOrigin = 'https://fonts.gstatic.com';

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    `font-src 'self' data: ${fontFileOrigin}`,
    `style-src 'self' 'unsafe-inline' ${fontStyleOrigin}`,
    "connect-src 'self'",
    "script-src 'self'",
  ];

  // React's development overlay and the HMR client evaluate
  // code at runtime. Production does not need it.
  if (process.env.NODE_ENV !== 'production') {
    directives[directives.length - 1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  }

  return directives.join('; ');
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  );
  response.headers.set('Content-Security-Policy', contentSecurityPolicy());

  return response;
}

function refuse(status: number, error: string): NextResponse {
  const response = withSecurityHeaders(
    NextResponse.json({ ok: false, error }, { status }),
  );

  // A refusal must never be stored by a shared cache and later
  // served to the same caller.
  response.headers.set('Cache-Control', 'no-store');

  return response;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get('host');
  const extraAllowedHosts = getExtraAllowedHosts();

  // 1. Host validation.
  if (!isAllowedHostHeader(host, extraAllowedHosts)) {
    return refuse(
      421,
      'This server only answers to its local address.',
    );
  }

  const method = request.method.toUpperCase();
  const { pathname } = request.nextUrl;

  // 2. Origin validation for state-changing requests. The
  //    origin is matched against the request's own scheme
  //    and hostname. Both are read through the trust gate
  //    (`requestScheme`) and the `Host` header — never from
  //    `request.url`, which Next.js rewrites from
  //    `X-Forwarded-Proto` and from any loopback hostname
  //    into `localhost`. A spoofed header must not be able
  //    to move the comparison.
  if (isStateChangingMethod(method)) {
    const origin = evaluateOrigin(
      request.headers.get('origin'),
      requestScheme(request),
      host,
      extraAllowedHosts,
    );

    if (!origin.allowed) {
      return refuse(403, 'Cross-origin request refused.');
    }

    const fetchSite = request.headers.get('sec-fetch-site');

    if (fetchSite === 'cross-site') {
      return refuse(403, 'Cross-site request refused.');
    }
  }

  const isApi = pathname.startsWith('/api/');
  const isPublic = PUBLIC_PAGES.has(pathname) || PUBLIC_API_PATHS.has(pathname);

  // 4. Session gate. The signature is verified, not merely
  //    looked for: a cookie that is present but forged,
  //    expired or signed with another token reaches nothing.
  if (isApi) {
    if (!isPublic && !isAuthenticated(request)) {
      return refuse(401, AUTH_REQUIRED_MESSAGE);
    }
  } else if (!isPublic && !isAuthenticated(request)) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = '/login';
    loginUrl.search = '';

    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set('Cache-Control', 'no-store');
    return withSecurityHeaders(redirect);
  }

  const response = NextResponse.next();

  if (isApi) {
    response.headers.set('Cache-Control', 'no-store');
  }

  return withSecurityHeaders(response);
}

export default proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
