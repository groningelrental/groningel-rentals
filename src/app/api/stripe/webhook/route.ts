import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/lib/stripe-service';
import { updateUser, findUserByStripeCustomerId, findUserByEmail } from '@/lib/services/userService';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  console.log('Webhook received!');
  
  const sig = req.headers.get('stripe-signature');
  // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const webhookSecret = "whsec_070aa5f49efb0132a0d956a4054496c4e46e4c78ec2af2d34cd5fb4f56495bb0";
  let event: Stripe.Event;

  const body = await req.text();
  console.log('Webhook body received:', body.substring(0, 100) + '...');

  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
    console.log('Webhook event type:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    console.log('Processing checkout.session.completed event');
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    console.log('Customer ID from webhook:', customerId);
    console.log('Subscription ID:', subscriptionId);

    // Find user by Stripe customer ID
    const user = await findUserByStripeCustomerId(customerId);
    console.log('Found user by stripeCustomerId:', user);
    
    if (user) {
      await updateUser(user.id, {
        isSubscribed: true,
        subscriptionId,
        subscriptionStatus: 'active',
      });
      console.log('User updated successfully');
    } else {
      console.log('No user found for customer ID:', customerId);
      
      // Let's also try to find by email as fallback
      const customerEmail = session.customer_details?.email;
      if (customerEmail) {
        console.log('Trying to find user by email:', customerEmail);
        const userByEmail = await findUserByEmail(customerEmail);
        console.log('Found user by email:', userByEmail);
        
        if (userByEmail) {
          // Update the user with the correct stripeCustomerId
          await updateUser(userByEmail.id, {
            stripeCustomerId: customerId,
            isSubscribed: true,
            subscriptionId,
            subscriptionStatus: 'active',
          });
          console.log('User updated with correct stripeCustomerId');
        }
      }
    }
  }

  // Optionally handle subscription updates/cancellations here

  return NextResponse.json({ received: true });
} 