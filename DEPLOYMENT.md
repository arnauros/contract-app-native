# 🚀 Deployment Guide - Freelance Contract App

## 📋 Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Stripe Account** - Sign up at [stripe.com](https://stripe.com)
3. **Firebase Project** - Already configured
4. **OpenAI API Key** - Already configured

## 🔧 Environment Variables Setup

### Required Environment Variables for Production

Add these to your Vercel project settings:

#### Firebase Configuration
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAGsX27lCpZB1V4mMpCjE2R4OUfuIGwLuQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=freelance-project-3d0b5.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=freelance-project-3d0b5
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=freelance-project-3d0b5.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=778955743827
NEXT_PUBLIC_FIREBASE_APP_ID=1:778955743827:web:01d90c400022c4b6e0dca6
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-V595VGP5DM
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://freelance-project-3d0b5-default-rtdb.europe-west1.firebasedatabase.app
FIREBASE_SERVICE_ACCOUNT_KEY=<your-firebase-service-account-json>
```

#### Stripe Configuration (Production)
```bash
# Replace with your LIVE Stripe keys (not test keys)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...
```

#### OpenAI Configuration
```bash
OPENAI_API_KEY=sk-...
```

#### App Configuration
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## 💳 Setting Up Stripe for Production

### 1. Create Stripe Products & Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to **Live mode** (toggle in top left)
3. Go to **Products** → **Add Product**
4. Create your subscription plans:

#### Monthly Plan
- **Name**: "Pro Monthly"
- **Pricing**: $29/month (or your price)
- **Billing period**: Monthly
- **Copy the Price ID** (starts with `price_`)

#### Yearly Plan  
- **Name**: "Pro Yearly"
- **Pricing**: $290/year (or your price)
- **Billing period**: Yearly
- **Copy the Price ID** (starts with `price_`)

### 2. Get Live Stripe Keys

1. Go to **Developers** → **API Keys**
2. Copy the **Publishable key** (starts with `pk_live_`)
3. Copy the **Secret key** (starts with `sk_live_`)

### 3. Set Up Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://your-domain.vercel.app/api/stripe/webhooks`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook secret** (starts with `whsec_`)

## 🚀 Deploy to Vercel

### Method 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "feat: prepare for production deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a Next.js project

3. **Configure Environment Variables**:
   - In Vercel dashboard, go to your project
   - Go to **Settings** → **Environment Variables**
   - Add all the environment variables listed above
   - Make sure to use **Production** values for Stripe keys

4. **Deploy**:
   - Vercel will automatically deploy
   - Your app will be available at `https://your-project.vercel.app`

### Method 2: Deploy with Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables**:
   ```bash
   vercel env add STRIPE_SECRET_KEY
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   # ... add all other variables
   ```

## 🔍 Post-Deployment Checklist

### ✅ Verify Core Functionality

1. **Sign Up/Login**: Test user registration and authentication
2. **Contract Creation**: Create a test contract
3. **Invoice Generation**: Generate an invoice from a contract
4. **Stripe Integration**: Test the subscription flow
5. **Email Notifications**: Send a test contract

### ✅ Test Stripe Integration

1. **Test Mode**: First test with Stripe test keys
2. **Live Mode**: Switch to live keys and test with real card
3. **Webhooks**: Verify webhook events are received
4. **Subscriptions**: Test subscription creation and management

### ✅ Monitor & Debug

1. **Vercel Logs**: Check function logs in Vercel dashboard
2. **Firebase Console**: Monitor database and auth
3. **Stripe Dashboard**: Monitor payments and subscriptions
4. **OpenAI Usage**: Monitor API usage and costs

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check environment variables are set
   - Verify all imports and dependencies

2. **Stripe Errors**:
   - Ensure you're using live keys (not test keys)
   - Verify webhook endpoint is accessible
   - Check webhook secret is correct

3. **Firebase Issues**:
   - Verify service account key is properly formatted
   - Check Firebase project permissions

4. **Authentication Issues**:
   - Verify Firebase auth domain is configured
   - Check CORS settings

### Getting Help

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Stripe Docs**: [stripe.com/docs](https://stripe.com/docs)
- **Firebase Docs**: [firebase.google.com/docs](https://firebase.google.com/docs)

## 💡 Pro Tips

1. **Use Vercel's Preview Deployments** for testing before production
2. **Set up monitoring** with Vercel Analytics
3. **Configure custom domain** in Vercel dashboard
4. **Set up error tracking** with Sentry or similar
5. **Monitor API costs** for OpenAI and other services

## 🔐 Security Checklist

- ✅ Environment variables are secure
- ✅ Firebase rules are properly configured
- ✅ Stripe webhooks are verified
- ✅ HTTPS is enforced
- ✅ CORS is properly configured

---

**Ready to deploy!** 🚀 Follow these steps and your freelance contract app will be live and ready for users!
