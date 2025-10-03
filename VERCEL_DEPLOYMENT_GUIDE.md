# 🚀 Vercel Deployment Guide for Stripe Payment Flow

This guide will help you deploy your freelance contract app to Vercel with working Stripe payments.

## 📋 Pre-Deployment Checklist

### ✅ 1. Environment Variables Setup

You need to configure these environment variables in Vercel:

#### Firebase Configuration
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAGsX27lCpZB1V4mMpCjE2R4OUfuIGwLuQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=freelance-project-3d0b5.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=freelance-project-3d0b5
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=freelance-project-3d0b5.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=778955743827
NEXT_PUBLIC_FIREBASE_APP_ID=1:778955743827:web:01d90c400022c4b6e0dca6
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-V595VGP5DM
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://freelance-project-3d0b5-default-rtdb.europe-west1.firebasedatabase.app
```

#### Firebase Service Account (REQUIRED)
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"freelance-project-3d0b5",...}
```

#### Stripe Configuration (LIVE MODE)
```
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_MONTHLY_PRICE_ID=price_1RLht5EAkEk7AeWQgRQmeWcF
STRIPE_YEARLY_PRICE_ID=price_1RM311EAkEk7AeWQBKwfeYxy
```

#### App Configuration
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_DISABLE_ANONYMOUS_AUTH=true
NODE_ENV=production
```

#### Other Services
```
OPENAI_API_KEY=your_openai_api_key_here
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=contracts@arnau.design
NEXT_PUBLIC_EMAIL_FROM=contracts@arnau.design
```

### ✅ 2. Stripe Webhook Configuration

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://your-domain.vercel.app/api/stripe/webhooks`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook secret** and add it to Vercel environment variables

## 🚀 Deployment Steps

### Method 1: Deploy via Vercel CLI (Recommended)

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
   vercel env add STRIPE_WEBHOOK_SECRET
   vercel env add STRIPE_MONTHLY_PRICE_ID
   vercel env add STRIPE_YEARLY_PRICE_ID
   vercel env add FIREBASE_SERVICE_ACCOUNT_KEY
   # ... add all other variables
   ```

### Method 2: Deploy via GitHub + Vercel Dashboard

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
   - Make sure to use **Production** values

4. **Deploy**:
   - Vercel will automatically deploy
   - Your app will be available at `https://your-project.vercel.app`

## 🔧 Post-Deployment Configuration

### 1. Update App URL
After deployment, update the `NEXT_PUBLIC_APP_URL` environment variable in Vercel with your actual domain.

### 2. Configure Stripe Webhook
Update the webhook endpoint URL in Stripe Dashboard to match your Vercel domain.

### 3. Test the Deployment
1. Visit your deployed app
2. Go to `/stripe-test` to run comprehensive tests
3. Test the payment flow with real test cards

## 🧪 Testing Production

### Test Pages Available:
- `/stripe-test` - Comprehensive test suite
- `/test-flow` - Simple payment flow test
- `/subscribe` - Main subscription page

### Test Cards (Stripe Test Mode):
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

## 🔍 Troubleshooting

### Common Issues:

1. **Webhook not receiving events**:
   - Check webhook URL in Stripe Dashboard
   - Verify webhook secret in environment variables
   - Check Vercel function logs

2. **Payment success but no subscription**:
   - Check webhook events in Stripe Dashboard
   - Verify Firebase Admin configuration
   - Check user document in Firestore

3. **Environment variables not loading**:
   - Ensure variables are set in Vercel dashboard
   - Redeploy after adding new variables
   - Check variable names match exactly

### Debug Tools:
- Use `/stripe-test` page for comprehensive testing
- Check Vercel function logs for errors
- Monitor Stripe Dashboard for webhook events

## 📊 Monitoring

### Stripe Dashboard:
- Monitor webhook deliveries
- Check subscription status
- Review payment events

### Vercel Dashboard:
- Monitor function logs
- Check deployment status
- Review performance metrics

### Firebase Console:
- Monitor user subscriptions
- Check Firestore data
- Review authentication logs

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ App loads without errors
- ✅ User registration/login works
- ✅ Stripe test connection passes
- ✅ Payment flow completes successfully
- ✅ Webhook events are received
- ✅ Subscription status updates correctly
- ✅ User can access premium features

---

**Ready to deploy?** Follow the steps above and your Stripe payment flow will be working in production! 🚀
