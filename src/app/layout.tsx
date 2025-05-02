import { Metadata } from "next";
import "@/app/globals.css";
import { ErrorBoundary } from "react-error-boundary";
import ClientWrapper from "./Components/ClientWrapper";
import ErrorFallbackComponent from "./Components/ErrorFallback";
import RedirectToDashboard from "./Components/RedirectToDashboard";

export const metadata: Metadata = {
  title: "Next.js App",
  description: "Created with Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={metadata.description as string} />
      </head>
      <body suppressHydrationWarning={true}>
        <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
          <RedirectToDashboard />
          <ClientWrapper>{children}</ClientWrapper>
        </ErrorBoundary>
      </body>
    </html>
  );
}
