import { Resend } from 'resend';

// Initialize Resend with API key (conditional for build time)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationEmail {
  userEmail: string;
  userName: string;
  propertyCount: number;
  newProperties: Array<{
    title: string;
    price: number;
    location: string;
    sourceUrl: string;
    agent: string;
  }>;
}

export class EmailService {
  private static instance: EmailService;
  private fromEmail = 'notifications@groningenrentals.com';

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY || !resend) {
        console.warn('🚫 No RESEND_API_KEY found, skipping email send');
        return false;
      }

      const result = await resend.emails.send({
        from: this.fromEmail,
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log('✅ Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      subject: 'Welcome to GroningenRentals - Email Notifications Activated! 🏠',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to GroningenRentals</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🏠 Welcome to GroningenRentals!</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Your rental property notifications are now active</p>
          </div>

          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi ${userName}! 👋</h2>

            <p>Welcome to GroningenRentals! Your email notifications have been successfully activated.</p>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">🔔 What you'll receive:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Instant alerts for new properties in Groningen</li>
                <li>Price drops and special offers</li>
                <li>Properties from 9+ real estate agencies</li>
                <li>Direct links to official listings</li>
              </ul>
            </div>

            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0066cc; margin-top: 0;">📊 Currently monitoring:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #0066cc;">
                <li>Gruno Verhuur (Real-time scraping)</li>
                <li>Van der Meulen Makelaars</li>
                <li>Rotsvast Groningen</li>
                <li>Nova Vastgoed</li>
                <li>DC Wonen</li>
                <li>123Wonen</li>
                <li>MVGM Wonen</li>
                <li>K&P Makelaars</li>
                <li>Expat Groningen</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://groningenrentals.com/properties" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Browse Properties Now 🔍</a>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="font-size: 14px; color: #666; text-align: center;">
              Questions? Reply to this email or visit our website.<br>
              <a href="https://groningenrentals.com" style="color: #667eea;">groningenrentals.com</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to GroningenRentals, ${userName}!

Your email notifications are now active. You'll receive:
- Instant alerts for new properties in Groningen
- Price drops and special offers
- Properties from 9+ real estate agencies
- Direct links to official listings

Currently monitoring: Gruno Verhuur, Van der Meulen, Rotsvast, Nova Vastgoed, DC Wonen, 123Wonen, MVGM, K&P Makelaars, and Expat Groningen.

Visit: https://groningenrentals.com/properties`
    };

    return this.sendEmail(template);
  }

  async sendPropertyNotification(notification: NotificationEmail): Promise<boolean> {
    const propertyListHtml = notification.newProperties.map(prop => `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 10px 0; background: #f9f9f9;">
        <h4 style="margin: 0 0 10px 0; color: #333;">${prop.title}</h4>
        <p style="margin: 5px 0; color: #666;"><strong>€${prop.price.toLocaleString()}/month</strong> • ${prop.location}</p>
        <p style="margin: 5px 0; color: #888; font-size: 14px;">📍 ${prop.agent}</p>
        <a href="${prop.sourceUrl}" style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px; font-size: 14px; display: inline-block; margin-top: 10px;">View Property →</a>
      </div>
    `).join('');

    const template: EmailTemplate = {
      to: notification.userEmail,
      subject: `🏠 ${notification.newProperties.length} New Properties in Groningen!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Properties Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏠 New Properties Alert!</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0;">${notification.newProperties.length} new properties found</p>
          </div>

          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi ${notification.userName}! 👋</h2>

            <p>We found <strong>${notification.newProperties.length} new properties</strong> that match your criteria in Groningen!</p>

            <div style="margin: 20px 0;">
              ${propertyListHtml}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://groningenrentals.com/properties" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">View All Properties 🔍</a>
            </div>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #666; text-align: center;">
                📊 Total properties in our database: <strong>${notification.propertyCount}</strong><br>
                🔄 Data updated every 10 minutes
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="font-size: 14px; color: #666; text-align: center;">
              Don't want these emails? <a href="https://groningenrentals.com/notifications" style="color: #667eea;">Manage notifications</a><br>
              <a href="https://groningenrentals.com" style="color: #667eea;">groningenrentals.com</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `New Properties Alert!

Hi ${notification.userName}!

We found ${notification.newProperties.length} new properties in Groningen:

${notification.newProperties.map(prop =>
  `• ${prop.title} - €${prop.price}/month (${prop.agent})\n  ${prop.sourceUrl}`
).join('\n\n')}

Total properties: ${notification.propertyCount}
View all: https://groningenrentals.com/properties`
    };

    return this.sendEmail(template);
  }

  async sendConfirmationEmail(userEmail: string, userName: string): Promise<boolean> {
    const template: EmailTemplate = {
      to: userEmail,
      subject: '✅ Email Notifications Confirmed - GroningenRentals',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Confirmed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Email Confirmed!</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">You're all set to receive property alerts</p>
          </div>

          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Perfect, ${userName}! 🎉</h2>

            <p>Your email address <strong>${userEmail}</strong> has been confirmed and added to our notification system.</p>

            <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0; margin-bottom: 10px;">🔔 What happens next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #155724;">
                <li>You'll get instant alerts when new properties are found</li>
                <li>We scan 9+ real estate agencies every 10 minutes</li>
                <li>All emails include direct links to official listings</li>
                <li>No spam - only genuine property alerts</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://groningenrentals.com/properties" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Start Browsing Properties 🏠</a>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">⚙️ Manage your notifications:</h3>
              <p style="margin: 0;">
                <a href="https://groningenrentals.com/notifications" style="color: #667eea;">Visit your notification settings</a> to customize what alerts you receive.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="font-size: 14px; color: #666; text-align: center;">
              Questions? Reply to this email or visit our website.<br>
              <a href="https://groningenrentals.com" style="color: #667eea;">groningenrentals.com</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `Email Confirmed!

Perfect, ${userName}!

Your email address ${userEmail} has been confirmed and added to our notification system.

What happens next?
- You'll get instant alerts when new properties are found
- We scan 9+ real estate agencies every 10 minutes
- All emails include direct links to official listings
- No spam - only genuine property alerts

Manage notifications: https://groningenrentals.com/notifications
Browse properties: https://groningenrentals.com/properties`
    };

    return this.sendEmail(template);
  }
}

export const emailService = EmailService.getInstance();
