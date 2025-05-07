"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/firebase/authContext";

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
