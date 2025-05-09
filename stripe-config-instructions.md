# Stripe Configuration Instructions

The logs show that your Stripe configuration is failing because the price IDs are set to placeholder values. To fix this issue, you need to:

1. Create or update your `.env.local` file in the project root with the following variables:

```
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Stripe Price IDs - Replace these with your actual price IDs from Stripe Dashboard
STRIPE_MONTHLY_PRICE_ID=price_123456789monthly
STRIPE_YEARLY_PRICE_ID=price_123456789yearly
```

2. Replace the placeholders with your actual Stripe keys:

   - Get your publishable key and secret key from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Create products and pricing in the [Stripe Dashboard](https://dashboard.stripe.com/products)
   - Use the actual price IDs from your Stripe products

3. After updating the environment variables, restart your development server.

## Getting Stripe Price IDs

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to Products > [Your Product]
3. Under Pricing, you'll see your price IDs (they start with "price\_")
4. Create one price for monthly billing and one for yearly billing
5. Copy these IDs to your `.env.local` file

## Testing in Development

For development, you can use Stripe's test mode. Make sure you're using the test API keys (they start with `pk_test_` and `sk_test_`).

## After Configuration

Once you've properly configured your Stripe environment variables:

1. The error message will disappear
2. You'll be able to proceed with the checkout process
3. The subscription flow will work correctly
