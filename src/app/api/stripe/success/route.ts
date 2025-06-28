import { NextRequest, NextResponse } from 'next/server';
import { createJWTToken } from '@/lib/security';
import { findUserById } from '@/lib/services/userService';
import { serialize } from 'cookie';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const userId = searchParams.get('user_id');

    if (!sessionId || !userId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=invalid_redirect`);
    }

    // Find the user
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=user_not_found`);
    }

    // Check if user is subscribed
    if (!user.isSubscribed) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=payment_required`);
    }

    // Create JWT token
    const token = await createJWTToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set secure HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    };

    const cookie = serialize('auth-token', token, cookieOptions);

    // Redirect to dashboard with cookie
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/properties`);
    response.headers.set('Set-Cookie', cookie);

    return response;

  } catch (error) {
    console.error('Stripe success handler error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=login_failed`);
  }
} 