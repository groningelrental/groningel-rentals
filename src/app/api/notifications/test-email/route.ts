import { type NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime for email operations
export const runtime = 'nodejs';
import { emailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, type = 'welcome' } = body;

    if (!email) {
      return NextResponse.json(
        {
          error: 'Email is required',
          message: 'Please provide an email address'
        },
        { status: 400 }
      );
    }

    const userName = name || email.split('@')[0];
    let success = false;

    switch (type) {
      case 'welcome':
        success = await emailService.sendWelcomeEmail(email, userName);
        break;
      case 'confirmation':
        success = await emailService.sendConfirmationEmail(email, userName);
        break;
      case 'notification':
        // Send a test property notification
        success = await emailService.sendPropertyNotification({
          userEmail: email,
          userName: userName,
          propertyCount: 24,
          newProperties: [
            {
              title: 'Moesstraat 45A, 9717JV Groningen',
              price: 973,
              location: 'Groningen Centrum',
              sourceUrl: 'https://groningenrentals.com/property/test',
              agent: 'Gruno Verhuur'
            },
            {
              title: 'Oosterstraat 123, 9711XY Groningen',
              price: 1150,
              location: 'Groningen',
              sourceUrl: 'https://groningenrentals.com/property/test2',
              agent: 'Van der Meulen Makelaars'
            }
          ]
        });
        break;
      default:
        return NextResponse.json(
          {
            error: 'Invalid email type',
            message: 'Type must be: welcome, confirmation, or notification'
          },
          { status: 400 }
        );
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: `${type} email sent successfully to ${email}`,
        emailType: type,
        recipient: email
      });
    } else {
      return NextResponse.json(
        {
          error: 'Email sending failed',
          message: 'Could not send email. Check RESEND_API_KEY configuration.'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Test email error:', error);

    return NextResponse.json(
      {
        error: 'Failed to send test email',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
