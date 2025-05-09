# Stripe Integration Setup

This document explains how to set up Stripe for the subscription system.

## 1. Create a Stripe Account

If you don't have a Stripe account yet, go to [stripe.com](https://stripe.com) and sign up for a free account.

## 2. Enable Test Mode

Make sure you're in test mode (toggle in the Stripe dashboard) when setting up your development environment.

## 3. Get API Keys

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy the "Publishable key" and "Secret key"
3. Add them to your `.env.local` file:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
   STRIPE_SECRET_KEY=sk_test_your_secret_key
   ```

## 4. Create Products and Prices

1. Go to [Products](https://dashboard.stripe.com/products) in your Stripe Dashboard
2. Create a new product (e.g., "Pro Subscription")
3. Add two prices:
   - Monthly recurring price
   - Yearly recurring price
4. Copy the Price IDs and add them to your `.env.local` file:
   ```
   STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id
   STRIPE_YEARLY_PRICE_ID=price_your_yearly_price_id
   ```

## 5. Set Up Webhooks

Webhooks allow Stripe to notify your application about events like successful payments.

### For Local Development:

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Log in to your Stripe account with:
   ```bash
   stripe login
   ```
3. Start webhook forwarding:
   ```bash
   stripe listen --forward-to http://localhost:3000/api/stripe/webhooks
   ```
4. Copy the webhook signing secret displayed in the CLI output and add it to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

### For Production:

1. Go to [Webhooks](https://dashboard.stripe.com/webhooks) in your Stripe Dashboard
2. Click "Add endpoint"
3. Enter your production webhook URL (e.g., `https://yourdomain.com/api/stripe/webhooks`)
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the "Signing secret" and add it to your production environment variables

## 6. Test the Integration

1. Navigate to the test-admin page: `/test-admin`
2. Log in with your Firebase account
3. Try subscribing with the test buttons
4. Use Stripe test card number: `4242 4242 4242 4242` with any future expiration date and any CVC

For 3D Secure testing, use card: `4000 0000 0000 3220`

## 7. Check Database

After successful subscription, check your Firestore database. The user document should have:

- `stripeCustomerId` field
- `subscription` object with details about their subscription

## Troubleshooting

If you encounter issues:

1. Check browser console for errors
2. Look at the Stripe Dashboard Events log
3. Verify your webhook is receiving events (Stripe CLI or Dashboard)
4. Check Firebase Auth custom claims are being set correctly
