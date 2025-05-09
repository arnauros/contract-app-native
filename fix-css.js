// Fix CSS loading issues in development
console.log("Starting CSS fix for Next.js...");

// Check if we're in a development environment
const isDev = process.env.NODE_ENV === "development";

if (isDev) {
  console.log("Development environment detected. Fixing CSS loading...");

  // Simulate browser environment for testing
  if (typeof window !== "undefined") {
    // Add a small script to retry loading broken CSS
    const retryBrokenCss = () => {
      const links = document.querySelectorAll('link[rel="stylesheet"]');

      links.forEach((link) => {
        // Check if the link was already processed
        if (link.dataset.retried) return;

        // Mark as retried to avoid infinite loops
        link.dataset.retried = "true";

        // Create a new link element with the same attributes
        const newLink = document.createElement("link");
        newLink.rel = "stylesheet";
        newLink.href = link.href;

        // Replace the old link with the new one
        link.parentNode.replaceChild(newLink, link);

        console.log("Retrying CSS load for:", link.href);
      });
    };

    // Add a global function to manually retry
    window.retryCssLoading = retryBrokenCss;

    // Listen for load event and retry after a small delay
    window.addEventListener("load", () => {
      setTimeout(retryBrokenCss, 1000);
    });

    console.log(
      "CSS fix installed. If styles are still missing, you can manually run window.retryCssLoading() in the console."
    );
  }
}

export {};
