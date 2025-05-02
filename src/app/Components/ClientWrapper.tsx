"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";

// Dynamic import for client components
const ClientApp = dynamic(() => import("@/app/Components/ClientApp"), {
  ssr: false,
});

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <ClientApp>{children}</ClientApp>
      </Suspense>
      <Toaster />
      <div id="modal-root" />
    </>
  );
}
