import { type NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';

// Simple rate limit storage (same as middleware)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const remote = request.headers.get('x-remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return real || remote || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ip, path, clearAll = false } = body;

    if (clearAll) {
      rateLimitMap.clear();
      return NextResponse.json({
        success: true,
        message: 'All rate limits cleared'
      });
    }

    if (ip && path) {
      const key = `${ip}:${path}`;
      rateLimitMap.delete(key);
      return NextResponse.json({
        success: true,
        message: `Rate limit cleared for ${key}`
      });
    }

    if (ip) {
      // Clear all entries for this IP
      const keysToDelete = [];
      for (const key of rateLimitMap.keys()) {
        if (key.startsWith(`${ip}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => rateLimitMap.delete(key));

      return NextResponse.json({
        success: true,
        message: `Rate limits cleared for IP ${ip}`,
        clearedKeys: keysToDelete
      });
    }

    return NextResponse.json(
      {
        error: 'Invalid request',
        message: 'Provide ip, path, or set clearAll=true'
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Reset rate limit error:', error);

    return NextResponse.json(
      {
        error: 'Failed to reset rate limit',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Show current rate limit status
    const currentLimits = Array.from(rateLimitMap.entries()).map(([key, value]) => ({
      key,
      count: value.count,
      resetTime: new Date(value.resetTime).toISOString(),
      remaining: Math.max(0, value.resetTime - Date.now())
    }));

    return NextResponse.json({
      success: true,
      rateLimits: currentLimits,
      totalEntries: rateLimitMap.size
    });

  } catch (error) {
    console.error('Get rate limits error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get rate limits',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
