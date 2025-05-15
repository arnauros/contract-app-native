import Cookies from "js-cookie";

/**
 * Synchronizes the subscription cookie with Firebase auth claims
 * This is particularly useful for handling the case where a user cancels and then resubscribes
 *
 * @param claims Firebase auth custom claims containing subscription information
 * @returns void
 */
export const synchronizeSubscriptionCookie = (claims: any): void => {
  if (!claims) return;

  // Get subscription status from claims
  const subscriptionStatus = claims.subscriptionStatus;

  // If no status in claims, don't update cookie
  if (!subscriptionStatus) {
    console.warn(
      "No subscription status found in claims, skipping cookie sync"
    );
    return;
  }

  // Get current cookie value
  const currentCookieValue = Cookies.get("subscription_status");

  // Handle the case where the cookie is missing or different from claims
  if (currentCookieValue !== subscriptionStatus) {
    console.log(
      `Synchronizing subscription_status cookie: ${
        currentCookieValue || "(none)"
      } -> ${subscriptionStatus}`
    );

    // Set cookie to match claims
    Cookies.set("subscription_status", subscriptionStatus, {
      expires: 30, // 30 days
      path: "/",
      sameSite: "lax",
    });

    // Special handling for active subscriptions - make sure we always set "active"
    // for any active subscription status variants
    if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
      // Double-check that the cookie was set correctly
      setTimeout(() => {
        const verifiedCookie = Cookies.get("subscription_status");
        if (verifiedCookie !== "active") {
          console.warn("Cookie not set correctly, forcing to active");
          Cookies.set("subscription_status", "active", {
            expires: 30,
            path: "/",
            sameSite: "lax",
          });
        }
      }, 100);
    }
  } else {
    console.log(
      `Cookie already synchronized with claims: ${subscriptionStatus}`
    );
  }
};

/**
 * Force update the subscription cookie to a specific value
 * This can be used as a last resort when other methods fail
 *
 * @param status The status to set (usually "active" or "canceled")
 */
export const forceUpdateSubscriptionCookie = (status: string): void => {
  console.log(`Force updating subscription cookie to: ${status}`);

  // Remove any existing cookie first
  Cookies.remove("subscription_status", { path: "/" });

  // Set the new cookie value
  Cookies.set("subscription_status", status, {
    expires: 30,
    path: "/",
    sameSite: "lax",
  });
};
