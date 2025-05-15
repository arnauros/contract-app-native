# Subscription System Guide

## How to Verify Subscription Cancellation

When a user cancels their subscription in the mock Stripe portal, several things happen in the system:

1. **Firestore database update** - The user's subscription data in Firestore is updated to:

   - Set `status` to "canceled"
   - Set `cancelAtPeriodEnd` to `true`
   - Set `currentPeriodEnd` to a future date (typically 1 day ahead in the mock system)

2. **Auth claims update** - The user's Firebase Auth custom claims are updated to:

   - Set `subscriptionStatus` to "canceled"
   - Set `subscriptionTier` to "free"
   - Preserve the `subscriptionId` for reference

3. **Cookies update** - A browser cookie named `subscription_status` is set to "canceled"

4. **Token refresh** - The user's auth token is forced to refresh to apply the new claims immediately

### Verifying Cancellation Success

To verify that cancellation worked correctly, you can:

1. **Use the Subscription Debug tool**:

   - Go to `/dashboard/subscription-debug`
   - This page is always accessible even after your subscription is canceled
   - Check all three sections (Claims, Firestore, Cookies) to ensure they show "canceled" status

2. **Check permission errors**:

   - After cancellation, you should see "Missing or insufficient permissions" errors in the console when accessing premium content
   - These errors confirm that your Firebase security rules are correctly preventing access

3. **Check UI elements**:
   - You should see a yellow banner stating "Your subscription has been canceled"
   - The dashboard should indicate you're on a free plan

### Accessing the Debug Page After Cancellation

We've specifically configured the subscription debug page to remain accessible even after subscription cancellation. This is done through our middleware configuration which exempts this route from subscription protection.

Direct URL: [http://localhost:3000/dashboard/subscription-debug](http://localhost:3000/dashboard/subscription-debug)

You'll still need to be logged in, but you don't need an active subscription to access this page.

### Troubleshooting

If cancellation doesn't seem to work:

1. **Token refresh issues**:

   - Sometimes the auth token doesn't refresh properly
   - Click the "Refresh Data" button in the debug tool to force a token refresh
   - Or use the "Force Token Refresh" button in the DebugClaims component

2. **Database update issues**:

   - If Firestore shows "canceled" but claims still show "active"
   - Use the "Reset Claims" button in the DebugClaims component to sync them

3. **Stripe dashboard vs Firebase**:
   - In real Stripe integrations, the Stripe dashboard might still show subscriptions as active
   - What matters is the Firebase Auth claims which control access to your app

## Expected Behavior After Cancellation

1. **During remaining subscription period**:

   - User still has access to premium features
   - Yellow banner shows subscription is canceled
   - Claims show "canceled" but access is still granted until period end

2. **After subscription period ends**:
   - User loses access to premium features
   - Attempts to access premium content will result in permission errors
   - User is redirected to upgrade pages when trying to access premium routes

## Mock Stripe Portal vs Real Stripe

The mock Stripe portal in development simulates what happens in production, with a few differences:

- **Period end timing** - Mock cancellations set period end to 24 hours in the future instead of the end of the billing cycle
- **Stripe API calls** - The mock portal doesn't make actual Stripe API calls
- **Webhooks** - The real Stripe integration uses webhooks to update subscription status, while the mock directly updates Firebase

Otherwise, the cancellation flow, permissions handling, and user experience should be identical between development and production environments.
