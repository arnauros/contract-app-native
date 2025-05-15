"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/context/AuthProvider";
import { Toaster as HotToaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
    >
      <AuthProvider>
        <HotToaster position="top-center" />
        {children}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
