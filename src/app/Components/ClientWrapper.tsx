"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";

// Dynamic import with no SSR to avoid hydration errors
const ClientApp = dynamic(() => import("@/app/Components/ClientApp"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
    </div>
  ),
});

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClientApp>{children}</ClientApp>
      <Toaster position="top-center" />
      <div id="modal-root" />
    </>
  );
}
