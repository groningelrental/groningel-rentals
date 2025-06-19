# GroningenRentals - Login Credentials & Email Setup

## 🔐 Login Credentials

### Admin Users
- **Email:** `admin@groningenrentals.com`
- **Password:** `admin2025`
- **Role:** Admin (full access)

- **Email:** `sweder@groningenrentals.com`
- **Password:** `sweder2025`
- **Role:** Admin (full access)
- **Name:** Sweder Andersson

### Demo User
- **Email:** `demo@groningenrentals.com`
- **Password:** `demo2025`
- **Role:** Demo (limited access)

## 📧 Email Notifications Setup

### 1. Configure Email Service (Resend)

To enable email notifications, you need to set up a Resend API key:

1. **Sign up for Resend:** https://resend.com
2. **Get your API key** from the dashboard
3. **Add to environment variables:**

```bash
# In .env.local file
RESEND_API_KEY=your_actual_resend_api_key_here
```

### 2. Test Email Functionality

Once configured, you can test emails using the API:

#### Test Welcome Email:
```bash
curl -X POST https://groningenrentals.com/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "name": "Your Name",
    "type": "welcome"
  }'
```

#### Test Confirmation Email:
```bash
curl -X POST https://groningenrentals.com/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "name": "Your Name",
    "type": "confirmation"
  }'
```

#### Test Property Notification:
```bash
curl -X POST https://groningenrentals.com/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "name": "Your Name",
    "type": "notification"
  }'
```

### 3. Subscribe to Notifications

Users can subscribe through the website:
- Visit: https://groningenrentals.com/notifications
- Enter email address and preferences
- Automatic welcome + confirmation emails will be sent

## 🎯 Email Features

### Welcome Email
- Sent when user first subscribes
- Lists all monitored agencies
- Explains notification system
- Professional design with branding

### Confirmation Email
- Confirms email address is active
- Details what to expect
- Links to manage notifications
- Call-to-action buttons

### Property Notifications
- Sent when new properties are found
- Includes property details, prices, photos
- Direct links to agency websites
- Unsubscribe options

## 🚀 Live Website

- **Website:** https://groningenrentals.com
- **Admin Panel:** Login with admin credentials for full access
- **Notifications:** https://groningenrentals.com/notifications

## 📊 Current Status

- ✅ **24+ properties** currently available
- ✅ **10+ real properties** from Gruno Verhuur
- ✅ **Real-time scraping** every 10 minutes
- ✅ **Email system** ready (needs API key)
- ✅ **Netlify deployment** working
- ✅ **Node.js runtime** for web scraping

## 🔧 Environment Setup

Create `.env.local` file:
```bash
# Email Service
RESEND_API_KEY=your_resend_api_key_here

# Application
NODE_ENV=production
APP_NAME=GroningenRentals
APP_URL=https://groningenrentals.com

# Security (auto-generated in production)
JWT_SECRET=your-secret-jwt-key
```

## 📝 Notes

- Email service is optional - website works without it
- Without email config, notifications just won't be sent
- All login credentials use bcrypt hashing for security
- Admin users can view subscriber lists and stats
