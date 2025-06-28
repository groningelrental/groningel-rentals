import { type NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime for bcrypt and crypto operations
export const runtime = 'nodejs';
import { validateInput, registerSchema } from '@/lib/validation';
import { hashPassword, sanitizeError } from '@/lib/security';
import { createUser, findUserByEmail, updateUser } from '@/lib/services/userService';
import { StripeService } from '@/lib/stripe-service';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = validateInput(registerSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid registration data',
          details: validation.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        {
          error: 'Registration failed',
          message: 'User with this email already exists',
        },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create new user
    const newUser = await createUser({
      email,
      passwordHash,
      name: name || email.split('@')[0], // Use email prefix as name if not provided
      isSubscribed: false,
    });

    // Create Stripe customer
    const customer = await StripeService.createCustomer({
      email: newUser.email,
      name: newUser.name,
    });

    // Update user with Stripe customer ID
    const updatedUser = await updateUser(newUser.id, {
      stripeCustomerId: customer.id,
    });

    // Create Stripe checkout session
    const session = await StripeService.createCheckoutSession({
      customerId: customer.id,
      customerEmail: newUser.email,
      customerName: newUser.name,
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}&user_id=${newUser.id}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/login?error=payment_cancelled`,
    });

    // Return success response with Stripe checkout URL
    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful. Please complete payment to access your account.',
        user: updatedUser,
        checkoutUrl: session.url,
        sessionId: session.id,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);

    const sanitizedError = sanitizeError(error);

    return NextResponse.json(
      {
        error: 'Registration failed',
        message: sanitizedError.message,
      },
      { status: sanitizedError.status }
    );
  }
} 