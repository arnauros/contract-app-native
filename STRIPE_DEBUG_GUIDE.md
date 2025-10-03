# 🔧 Stripe Payment Flow Debug Guide

This guide helps you debug issues with the Stripe payment flow in your freelance contract app.

## 🚀 Quick Test Pages

### 1. Comprehensive Test Suite

Visit: `http://localhost:3000/stripe-test`

This page provides:

- ✅ Stripe configuration testing
- ✅ Price ID validation
- ✅ Webhook endpoint testing
- ✅ User subscription status checking
- ✅ Live checkout testing
- ✅ Detailed test results with timestamps

### 2. Simple Test Flow

Visit: `http://localhost:3000/test-flow`

This page provides:

- ✅ Basic subscription flow testing
- ✅ Authentication status display
- ✅ Simple checkout process

## 🔍 Common Issues & Solutions

### Issue 1: "Invalid price ID" Error

**Symptoms:**

- Error: "Invalid price ID: price_xxx"
- Checkout fails immediately

**Solutions:**

1. Verify price IDs in `.env.local`:

   ```bash
   STRIPE_MONTHLY_PRICE_ID=price_1RLht5EAkEk7AeWQgRQmeWcF
   STRIPE_YEARLY_PRICE_ID=price_1RM311EAkEk7AeWQBKwfeYxy
   ```

2. Test price IDs with the test suite at `/stripe-test`

3. Ensure you're using LIVE price IDs with LIVE API keys

### Issue 2: Webhook Signature Verification Failed

**Symptoms:**

- Error: "Webhook signature verification failed"
- Payments complete but subscription not activated

**Solutions:**

1. Check webhook secret in `.env.local`:

   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_repMvy1wo9GjWlpHTCwxdyuHjdYCgA9Z
   ```

2. For local development, use Stripe CLI:

   ```bash
   stripe listen --forward-to http://localhost:3000/api/stripe/webhooks
   ```

3. For production, ensure webhook endpoint is configured in Stripe Dashboard

### Issue 3: Checkout Session Creation Fails

**Symptoms:**

- Error: "Failed to create checkout session"
- User can't proceed to payment

**Solutions:**

1. Verify Stripe API keys are correct and in LIVE mode
2. Check that user is authenticated
3. Ensure Firebase Admin is properly configured
4. Check server logs for detailed error messages

### Issue 4: Payment Success but No Subscription

**Symptoms:**

- Payment completes successfully
- User returns to success page
- But subscription status remains "none"

**Solutions:**

1. Check webhook events in Stripe Dashboard
2. Verify webhook endpoint is receiving events
3. Check Firebase Admin configuration
4. Ensure user document exists in Firestore

### Issue 5: Redirect Issues

**Symptoms:**

- Checkout session created but no redirect to Stripe
- User stays on the same page

**Solutions:**

1. Check browser console for JavaScript errors
2. Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
3. Ensure checkout URL is returned from API

## 🛠️ Debugging Steps

### Step 1: Test Stripe Configuration

```bash
# Run the verification script
node scripts/verify-stripe-config.js
```

### Step 2: Test API Endpoints

Visit `/stripe-test` and run all tests to identify specific issues.

### Step 3: Check Server Logs

```bash
# Start development server with verbose logging
npm run dev
```

Look for errors in the console output.

### Step 4: Test Webhook Endpoint

```bash
# Test webhook accessibility
curl -X POST http://localhost:3000/api/stripe/webhook-test
```

### Step 5: Verify Environment Variables

```bash
# Check if all required variables are set
node -e "console.log(process.env.STRIPE_SECRET_KEY ? 'Secret key: Set' : 'Secret key: Missing')"
node -e "console.log(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Publishable key: Set' : 'Publishable key: Missing')"
node -e "console.log(process.env.STRIPE_WEBHOOK_SECRET ? 'Webhook secret: Set' : 'Webhook secret: Missing')"
```

## 🔧 API Endpoints for Testing

### Test Connection

```
GET /api/stripe/test-connection
```

Tests Stripe API connectivity and configuration.

### Test Webhook

```
POST /api/stripe/webhook-test
```

Tests webhook endpoint accessibility.

### Verify Session

```
POST /api/stripe/verify-session
Body: { "sessionId": "cs_test_..." }
```

Verifies a checkout session after payment.

### Verify Subscription

```
POST /api/stripe/verify-subscription
Body: { "userId": "firebase_uid" }
```

Checks user's subscription status.

## 📊 Monitoring & Logs

### Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Check **Events** for webhook deliveries
3. Check **Customers** for created customers
4. Check **Subscriptions** for active subscriptions

### Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Check **Firestore** for user documents
3. Check **Authentication** for user claims

### Application Logs

Check your development server console for detailed error messages and debugging information.

## 🚨 Emergency Fixes

### Reset User Subscription

If a user's subscription is stuck, you can reset it:

1. Go to `/stripe-test`
2. Click "Test Subscription" to check current status
3. Use the debug tools to reset if needed

### Clear Checkout Locks

If checkout is stuck, clear browser storage:

```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
```

### Force Token Refresh

If authentication claims are out of sync:

1. Log out and log back in
2. Or use the debug tools in `/stripe-test`

## 📞 Getting Help

If you're still having issues:

1. **Check the test results** at `/stripe-test` for specific error messages
2. **Review server logs** for detailed error information
3. **Verify Stripe Dashboard** for webhook events and subscription status
4. **Test with a fresh user account** to rule out user-specific issues

## 🔄 Testing Checklist

Before going live, ensure:

- [ ] Stripe configuration test passes
- [ ] Price IDs are valid and active
- [ ] Webhook endpoint is accessible
- [ ] Test payment completes successfully
- [ ] Subscription is created in Firebase
- [ ] User can access premium features
- [ ] Webhook events are received and processed
- [ ] Payment success page works correctly
- [ ] User can access dashboard after payment

---

**Remember:** Always test with Stripe's test mode first, then switch to live mode for production!
