"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/context/AuthContext";
// import { RouteGuard } from "@/lib/components/RouteGuard";
import { SidebarProvider } from "@/lib/context/SidebarContext";
import ClientLayout from "@/app/Components/ClientLayout";
import { initFirebase } from "@/lib/firebase/init";

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

  // Debug the current URL
  useEffect(() => {
    console.log("ClientApp mounted, current URL:", window.location.href);
  }, []);

  return (
    <AuthProvider>
      {/* Temporarily bypass RouteGuard */}
      <SidebarProvider>
        <ClientLayout>{children}</ClientLayout>
      </SidebarProvider>
    </AuthProvider>
  );
}
