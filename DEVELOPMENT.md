# Development Guide

## Common Issues and Solutions

### Double Console Logs in Development

React's StrictMode intentionally mounts components twice in development to help detect potential bugs and side effects. This can result in duplicate console logs, API calls, and other effects.

#### Solution:

We've implemented a `logDebug` utility function in `src/lib/utils.ts` that uses timestamp-based deduplication:

```typescript
// Import the utility
import { logDebug } from "@/lib/utils";

// Use instead of console.log
logDebug("This will only log once even in StrictMode");
```

This ensures the same message isn't logged twice within a 1-second window.

#### Developer Note Component:

We've also added a `StrictModeNote` component in `src/components/DeveloperNote.tsx` that you can include in development-only UI to explain this behavior to other developers:

```jsx
import { StrictModeNote } from "@/components/DeveloperNote";

function MyComponent() {
  return (
    <div>
      {process.env.NODE_ENV === "development" && <StrictModeNote />}
      {/* Rest of your component */}
    </div>
  );
}
```

### Firebase Permissions Issues

When working with Firebase authentication and Firestore, permission issues can occur if a user's custom claims don't match their subscription status in the database.

#### Tools for Debugging:

1. `DebugClaims` component (`src/app/Components/DebugClaims.tsx`):

   - Check current claims
   - Reset claims to match database state
   - Force token refresh
   - Fix permissions

2. API endpoints:
   - `/api/debug/auth-claims`: Get current custom claims
   - `/api/debug/reset-claims`: Reset claims based on database state
   - `/api/debug/refresh-subscription-claims`: Update subscription-specific claims

#### Common Firebase Permission Fixes:

1. Call the reset-claims API endpoint
2. Force a token refresh with `await user.getIdToken(true)`
3. Reload the page

### Mock Stripe Portal

For local development without a real Stripe integration, we've implemented a mock Stripe customer portal that simulates subscription management.

#### Features:

- Cancel subscription
- Upgrade to yearly plan
- Update payment method (simulation)

#### How it works:

1. The mock portal is shown when:

   - Stripe is not configured in development
   - The user has a mock Stripe customer ID
   - There's an error accessing the real Stripe API

2. When a user cancels or changes their subscription:
   - Updates the subscription in Firestore
   - Updates auth claims via the `/api/debug/refresh-subscription-claims` endpoint
   - Forces a token refresh to apply the new claims
   - Sets cookies for client-side awareness
   - Redirects back to the dashboard with a status parameter

### Testing Subscription Status Changes

Use the following URL parameters to test subscription status changes:

- `/dashboard?subscription=canceled`: Shows the subscription canceled message
- `/dashboard?subscription=upgraded`: Shows the subscription upgraded message
- `/dashboard?mockStripePortal=true`: Opens the mock Stripe portal directly
