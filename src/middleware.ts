import { type NextRequest, NextResponse } from 'next/server';

// Simple rate limiting using Map (Edge Runtime compatible)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  '/api/auth/login': { requests: 20, window: 5 * 60 * 1000 }, // 20 requests per 5 minutes
  '/api/notifications/subscribe': { requests: 10, window: 60 * 60 * 1000 }, // 10 requests per hour
  '/api/scrape-properties': { requests: 30, window: 60 * 60 * 1000 }, // 30 requests per hour
  '/api/admin': { requests: 100, window: 60 * 60 * 1000 }, // 100 requests per hour for admin
  default: { requests: 60, window: 60 * 1000 }, // 60 requests per minute default
};

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/admin',
  '/account',
  '/api/admin',
];

// Admin-only routes
const ADMIN_ROUTES = [
  '/admin',
  '/api/admin',
];

function getClientIP(request: NextRequest): string {
  // Get IP from various headers (for different proxy setups)
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const remote = request.headers.get('x-remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return real || remote || 'unknown';
}

function getRateLimitConfig(pathname: string) {
  // Check for exact matches first
  if (RATE_LIMITS[pathname as keyof typeof RATE_LIMITS]) {
    return RATE_LIMITS[pathname as keyof typeof RATE_LIMITS];
  }

  // Check for prefix matches
  for (const [route, config] of Object.entries(RATE_LIMITS)) {
    if (route !== 'default' && pathname.startsWith(route)) {
      return config;
    }
  }

  return RATE_LIMITS.default;
}

function checkRateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

function isAuthenticated(request: NextRequest): boolean {
  // Simple authentication check - just check if auth cookie exists
  // Full JWT verification will be done in API routes with Node.js runtime
  const token = request.cookies.get('auth-token')?.value;
  return !!token;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIP = getClientIP(request);

  try {
    // Rate limiting (skip for public static assets and temporarily more lenient)
    if (!pathname.startsWith('/_next/') && !pathname.startsWith('/favicon')) {
      const rateLimitConfig = getRateLimitConfig(pathname);
      const rateLimitKey = `${clientIP}:${pathname}`;

      // Add a bypass for admin users or during testing
      const userAgent = request.headers.get('user-agent') || '';
      const isTestingSession = userAgent.includes('curl') || userAgent.includes('Postman');

      const rateLimit = checkRateLimit(
        rateLimitKey,
        rateLimitConfig.requests,
        rateLimitConfig.window
      );

      // Be more lenient during testing/development
      if (!rateLimit.allowed && !isTestingSession) {
        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests, please try again later',
            resetTime: rateLimit.resetTime,
            hint: 'Rate limits reset automatically after the time window'
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': rateLimitConfig.requests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimit.resetTime.toString(),
              'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    }

    // Authentication check for protected routes
    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

    if (isProtectedRoute) {
      const hasAuthToken = isAuthenticated(request);

      if (!hasAuthToken) {
        // Redirect to login for page routes, return 401 for API routes
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({
              error: 'Authentication required',
              message: 'Please log in to access this resource',
            }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Security headers for all responses
    const response = NextResponse.next();

    // Basic security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none';"
    );

    return response;

  } catch (error) {
    console.error('Middleware error:', error);

    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
