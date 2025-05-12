"use client";

import { RouteGuard } from "@/lib/components/RouteGuard";
import { SidebarProvider } from "@/lib/context/SidebarContext";
import ClientLayout from "@/app/Components/ClientLayout";
import { Suspense } from "react";

export default function ClientApp({ children }: { children: React.ReactNode }) {
  // Simple fallback loading component
  const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
      <p className="ml-2">Loading application...</p>
    </div>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouteGuard>
        <SidebarProvider>
          <ClientLayout>{children}</ClientLayout>
        </SidebarProvider>
      </RouteGuard>
    </Suspense>
  );
}
