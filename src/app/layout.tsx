import { Metadata, Viewport } from "next";
import "@/app/globals.css";
import "@/styles/globals.css";
import "@/styles/layout.css";
import { Providers } from "./providers";
import { Inter } from "next/font/google";

// Initialize font
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Next.js App",
  description: "Created with Next.js",
};

// Separate viewport export as recommended by Next.js
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta charSet="utf-8" />
        {/* Remove hardcoded CSS path - Next.js handles this automatically */}
      </head>
      <body
        suppressHydrationWarning={true}
        className={`antialiased ${inter.className}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
