"use client";

import { RouteGuard } from "@/lib/components/RouteGuard";
import { SubscriptionGuard } from "@/lib/components/SubscriptionGuard";
import { SidebarProvider } from "@/lib/context/SidebarContext";
import ClientLayout from "@/app/Components/ClientLayout";
import { Suspense } from "react";
import { usePathname } from "next/navigation";

export default function ClientApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Simple fallback loading component
  const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
      <p className="ml-2">Loading application...</p>
    </div>
  );

  // Determine if current route should be subscription-protected
  const isSubscriptionProtectedRoute =
    pathname &&
    (pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/") ||
      pathname.startsWith("/Contracts/") ||
      pathname === "/profile" ||
      pathname === "/new" ||
      pathname === "/store" ||
      pathname.startsWith("/view/"));

  // If in a subscription-protected route, wrap with SubscriptionGuard
  const wrappedContent = isSubscriptionProtectedRoute ? (
    <SubscriptionGuard>
      <SidebarProvider>
        <ClientLayout>{children}</ClientLayout>
      </SidebarProvider>
    </SubscriptionGuard>
  ) : (
    <SidebarProvider>
      <ClientLayout>{children}</ClientLayout>
    </SidebarProvider>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouteGuard>{wrappedContent}</RouteGuard>
    </Suspense>
  );
}
