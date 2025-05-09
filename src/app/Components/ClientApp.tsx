"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/context/AuthProvider";
import { RouteGuard } from "@/lib/components/RouteGuard";
import { SidebarProvider } from "@/lib/context/SidebarContext";
import ClientLayout from "@/app/Components/ClientLayout";
import { initFirebase } from "@/lib/firebase/firebase";

export default function ClientApp({ children }: { children: React.ReactNode }) {
  // Initialize Firebase in client component
  useEffect(() => {
    try {
      initFirebase();
      console.log("Firebase initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
    }
  }, []);

  return (
    <AuthProvider>
      <RouteGuard>
        <SidebarProvider>
          <ClientLayout>{children}</ClientLayout>
        </SidebarProvider>
      </RouteGuard>
    </AuthProvider>
  );
}
