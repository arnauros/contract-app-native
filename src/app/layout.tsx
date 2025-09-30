import { Metadata, Viewport } from "next";
import "./globals.css";
import { Roboto, Inter } from "next/font/google";
import { Providers } from "./providers";
import ClientWrapper from "./ClientWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Initialize fonts
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Metadata
export const metadata: Metadata = {
  title: "Macu",
  description: "Freelance Next.js Demo",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Global cleanup function to reset checkout state
const resetCheckoutState = () => {
  if (typeof window === "undefined") return;

  // Reset global flags
  if (window.GLOBAL_CHECKOUT_LOCK) {
    console.log("RootLayout: Resetting global checkout lock");
    window.GLOBAL_CHECKOUT_LOCK = false;
  }

  // Reset localStorage checkout flags
  const checkoutFlags = [
    "checkout_in_progress",
    "subscription_intent",
    "checkout_start_time",
    "checkout_session_id",
  ];

  // Only clear flags that might be stale (older than 5 minutes)
  const now = Date.now();
  const checkoutTimestamp = localStorage.getItem("checkout_timestamp");
  const timestampValue = checkoutTimestamp
    ? parseInt(checkoutTimestamp, 10)
    : 0;

  if (now - timestampValue > 5 * 60 * 1000) {
    checkoutFlags.forEach((flag) => {
      if (localStorage.getItem(flag)) {
        console.log(`RootLayout: Clearing stale checkout flag: ${flag}`);
        localStorage.removeItem(flag);
      }
    });

    // Update timestamp
    localStorage.setItem("checkout_timestamp", now.toString());
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className={roboto.variable}>
        <Providers>
          <ClientWrapper>{children}</ClientWrapper>
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
