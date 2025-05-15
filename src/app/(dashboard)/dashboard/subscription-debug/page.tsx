import SubscriptionDebug from "../../subscription-debug";

export default function SubscriptionDebugPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Subscription Debug</h1>

      <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-4 text-blue-700">
        <p className="font-medium">Note: This page is always accessible</p>
        <p>
          This debug page is exempt from subscription protection so you can
          access it even after canceling your subscription.
        </p>
        <p className="mt-2">
          <strong>URL:</strong>{" "}
          <code className="bg-blue-100 px-2 py-1 rounded">
            /dashboard/subscription-debug
          </code>
        </p>
      </div>

      <SubscriptionDebug />

      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-lg font-medium mb-2">
          How to verify your subscription cancellation:
        </h2>
        <ol className="list-decimal ml-4 space-y-2">
          <li>
            <strong>Firebase Auth Claims</strong>: This should show{" "}
            <code className="bg-gray-200 px-1 rounded">
              subscriptionStatus: "canceled"
            </code>{" "}
            if cancellation worked correctly.
          </li>
          <li>
            <strong>Firestore Subscription Data</strong>: Should show{" "}
            <code className="bg-gray-200 px-1 rounded">status: "canceled"</code>{" "}
            and{" "}
            <code className="bg-gray-200 px-1 rounded">
              cancelAtPeriodEnd: true
            </code>
            .
          </li>
          <li>
            <strong>Cookie Data</strong>: The cookie should be set to{" "}
            <code className="bg-gray-200 px-1 rounded">canceled</code>.
          </li>
          <li>
            The "Period End" date shows when your access will expire completely.
          </li>
        </ol>
        <div className="mt-4 border-t pt-4">
          <p className="text-sm font-medium">
            Expected behavior after cancellation:
          </p>
          <ul className="list-disc ml-4 text-sm">
            <li>
              You'll immediately see the "Your subscription has been canceled"
              banner
            </li>
            <li>
              You'll continue to have access until your current billing period
              ends
            </li>
            <li>
              When trying to access premium content, you should see permission
              errors in the console
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
