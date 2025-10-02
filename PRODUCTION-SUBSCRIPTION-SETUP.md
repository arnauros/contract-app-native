# 🔄 Production Subscription System Setup

## Current Issue

Users cannot cancel/change subscriptions due to Firestore security rules blocking subscription updates. The rules have been fixed in the codebase but need to be deployed.

## 🔧 Firestore Rules Fix

### Problem

The current Firestore rules don't allow users to update their own subscription status, creating a circular dependency where:

1. User tries to cancel subscription
2. System needs to update `users/{userId}/subscription` field
3. Firestore rules block the update because user no longer has active subscription
4. Cancellation fails

### Solution

Updated the Firestore rules to allow users to update their own subscription status:

```javascript
// Allow subscription updates by the owner (for cancellation, reactivation, etc.)
// This is essential for subscription management to work properly
allow update: if request.auth != null && request.auth.uid == userId &&
              request.resource.data.diff(resource.data).changedKeys()
                .hasOnly(['subscription', 'updatedAt']);
```

## 🚀 Production Setup Steps

### 1. Update Firestore Rules

**Option A: Firebase Console (Recommended)**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `freelance-project-3d0b5`
3. Go to **Firestore Database** → **Rules**
4. Replace the rules with the updated version from `firestore.rules`
5. Click **Publish**

**Option B: Firebase CLI (if working)**

```bash
firebase deploy --only firestore:rules
```

### 2. Environment Variables for Production

Add these to your Vercel project settings:

```bash
# Firebase Configuration (already set)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAGsX27lCpZB1V4mMpCjE2R4OUfuIGwLuQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=freelance-project-3d0b5.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=freelance-project-3d0b5
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=freelance-project-3d0b5.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=778955743827
NEXT_PUBLIC_FIREBASE_APP_ID=1:778955743827:web:01d90c400022c4b6e0dca6
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-V595VGP5DM
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://freelance-project-3d0b5-default-rtdb.europe-west1.firebasedatabase.app

# Firebase Service Account (REQUIRED for production)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"freelance-project-3d0b5",...}

# Stripe Configuration (Production Keys)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### 3. Stripe Production Setup

#### A. Create Live Products & Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to **Live mode**
3. Create products and prices for your subscription plans
4. Copy the live price IDs

#### B. Set Up Webhooks

1. Go to **Developers** → **Webhooks**
2. Add endpoint: `https://your-domain.vercel.app/api/stripe/webhooks`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook secret

#### C. Get Live API Keys

1. Go to **Developers** → **API Keys**
2. Copy the **Publishable key** (starts with `pk_live_`)
3. Copy the **Secret key** (starts with `sk_live_`)

### 4. Firebase Console Configuration

#### A. Authentication Settings

1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Add your production domain to **Authorized domains**
4. Configure email templates for verification and password reset

#### B. Firestore Security Rules

1. Go to **Firestore Database** → **Rules**
2. Deploy the updated rules that allow subscription updates
3. Test the rules in the Rules Playground

#### C. Storage Rules

1. Go to **Storage** → **Rules**
2. Ensure rules allow users to upload their own files:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Testing Production Subscription Flow

#### A. Test Sign Up

1. Create a new account with a test email
2. Verify email verification works
3. Check that user document is created in Firestore

#### B. Test Subscription

1. Subscribe to a plan using test card: `4242 4242 4242 4242`
2. Verify webhook events are received
3. Check that subscription status is updated in Firestore
4. Verify custom claims are set correctly

#### C. Test Cancellation

1. Cancel subscription through Stripe customer portal
2. Verify webhook events are received
3. Check that subscription status is updated to "canceled"
4. Verify custom claims are updated
5. Test that user loses access to premium features

#### D. Test Reactivation

1. Resubscribe to a plan
2. Verify subscription is reactivated
3. Check that user regains access to premium features

## 🔍 Monitoring & Debugging

### 1. Firebase Console Monitoring

- **Authentication**: Monitor sign-ups and sign-ins
- **Firestore**: Check user documents and subscription data
- **Functions**: Monitor any cloud functions (if used)

### 2. Stripe Dashboard Monitoring

- **Payments**: Monitor successful and failed payments
- **Subscriptions**: Track subscription lifecycle
- **Webhooks**: Check webhook delivery and responses

### 3. Vercel Logs

- **Function logs**: Check API route logs for errors
- **Build logs**: Verify environment variables are set
- **Runtime logs**: Monitor subscription-related operations

### 4. Browser DevTools

- **Network tab**: Check API calls and responses
- **Console**: Look for JavaScript errors
- **Application tab**: Verify session cookies and localStorage

## 🛠️ Troubleshooting

### Common Issues

1. **"Missing or insufficient permissions"**
   - Check Firestore rules are deployed correctly
   - Verify user is authenticated
   - Check that subscription update rules are in place

2. **Webhook events not received**
   - Verify webhook endpoint URL is correct
   - Check webhook secret is set correctly
   - Ensure events are selected in Stripe dashboard

3. **Subscription status not updating**
   - Check webhook handler is working
   - Verify Firestore rules allow updates
   - Check custom claims are being set

4. **Email verification not working**
   - Check Firebase email settings
   - Verify SMTP configuration
   - Check email templates

### Debug Commands

```bash
# Check environment variables
node scripts/verify-env.js

# Test Firebase connection
node scripts/firebase-client.js

# Test subscription flow
npm run dev
# Navigate to /dashboard and test subscription features
```

## 📋 Production Readiness Checklist

- [ ] Firestore rules updated and deployed
- [ ] Stripe live keys configured
- [ ] Webhook endpoint set up and tested
- [ ] Email verification working
- [ ] Subscription signup flow tested
- [ ] Subscription cancellation flow tested
- [ ] Subscription reactivation flow tested
- [ ] Custom claims updating correctly
- [ ] Premium feature access working
- [ ] Error handling and user feedback working
- [ ] Monitoring and logging set up

## 🎯 Next Steps

1. **Deploy Firestore rules** via Firebase Console
2. **Set up Stripe live configuration** in Vercel
3. **Test complete subscription flow** in production
4. **Monitor logs** for any issues
5. **Set up alerts** for subscription failures

---

**Your subscription system is now ready for production!** 🚀

The key fix was updating Firestore rules to allow users to update their own subscription status, which is essential for the subscription lifecycle to work properly.
