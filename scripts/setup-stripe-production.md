# 💳 Quick Stripe Production Setup

## Step 1: Get Your Live Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Switch to Live mode** (toggle in top left)
3. Go to **Developers** → **API Keys**
4. Copy these keys:
   - **Publishable key**: `pk_live_...`
   - **Secret key**: `sk_live_...`

## Step 2: Create Subscription Products

1. Go to **Products** → **Add Product**

### Monthly Plan

- **Name**: "Pro Monthly"
- **Pricing**: $29/month
- **Billing period**: Monthly
- **Copy Price ID**: `price_...`

### Yearly Plan

- **Name**: "Pro Yearly"
- **Pricing**: $290/year
- **Billing period**: Yearly
- **Copy Price ID**: `price_...`

## Step 3: Set Up Webhooks

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
5. **Copy Webhook Secret**: `whsec_...`

## Step 4: Update Environment Variables

Add these to your Vercel project:

```bash
STRIPE_SECRET_KEY=sk_live_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_YEARLY_PRICE_ID=price_your_yearly_price_id
```

## Step 5: Test

1. Deploy to Vercel
2. Test subscription flow with a real card
3. Verify webhook events in Stripe dashboard
4. Check that subscriptions are created in your app

---

**That's it!** Your Stripe integration is now ready for production! 🚀
