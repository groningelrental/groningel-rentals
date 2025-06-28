import { type NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime for JWT operations
export const runtime = 'nodejs';
import { verifyJWTToken, sanitizeError } from '@/lib/security';
import { findUserById } from '@/lib/services/userService';

export async function GET(request: NextRequest) {
  try {
    // Get the auth token from cookies
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          message: 'No authentication token found',
        },
        { status: 401 }
      );
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token);

    if (!payload) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          message: 'Authentication token is invalid or expired',
        },
        { status: 401 }
      );
    }

    // Fetch user from database
    const user = await findUserById(payload.userId);

    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found',
          message: 'User account no longer exists',
        },
        { status: 404 }
      );
    }

    // Return user information
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Auth check error:', error);

    const sanitizedError = sanitizeError(error);

    return NextResponse.json(
      {
        error: 'Authentication check failed',
        message: sanitizedError.message,
      },
      { status: sanitizedError.status }
    );
  }
}
