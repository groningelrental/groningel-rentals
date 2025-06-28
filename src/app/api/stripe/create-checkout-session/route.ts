import { type NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/lib/stripe-service';
import { findUserByEmail, updateUser } from '@/lib/services/userService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Find the user to get their ID
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create Stripe customer
    const customer = await StripeService.createCustomer({
      email,
      name,
    });

    // Update user with Stripe customer ID
    await updateUser(user.id, {
      stripeCustomerId: customer.id,
    });

    // Create checkout session
    const session = await StripeService.createCheckoutSession({
      customerId: customer.id,
      customerEmail: email,
      customerName: name,
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}&user_id=${user.id}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/login?error=payment_cancelled`,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Stripe checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 