import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export interface CreateCheckoutSessionData {
  customerId: string;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCustomerData {
  email: string;
  name: string;
}

export class StripeService {
  static async createCustomer(data: CreateCustomerData): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      email: data.email,
      name: data.name,
    });
  }

  static async createCheckoutSession(data: CreateCheckoutSessionData): Promise<Stripe.Checkout.Session> {
    return await stripe.checkout.sessions.create({
      customer: data.customerId,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Groningen Rentals Subscription',
              description: 'Access to exclusive property listings and notifications',
            },
            unit_amount: 999, // €9.99 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: {
        customerName: data.customerName,
      },
    });
  }

  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.retrieve(subscriptionId);
  }

  static async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return await stripe.customers.retrieve(customerId) as Stripe.Customer;
  }

  static async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.cancel(subscriptionId);
  }

  static async updateSubscription(subscriptionId: string, data: Partial<Stripe.SubscriptionUpdateParams>): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.update(subscriptionId, data);
  }
} 