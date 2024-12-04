"use client";

import { usePathname } from "next/navigation";
import Topbar from "@/app/Components/topbar";
import Sidebar from "@/app/Components/sidebar";
import "@/app/globals.css";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isViewRoute = pathname?.startsWith("/view/");

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My App</title>
      </head>
      <body className="bg-gray-100 text-gray-900">
        <div className="flex h-screen">
          {!isViewRoute && (
            <div className="  ">
              <Sidebar />
            </div>
          )}
          <div className="flex-1">
            <Topbar pathname={pathname} />
            <div className="">
              <main className="scrollable-content">{children}</main>
            </div>
          </div>
        </div>
        <Toaster />
        <div id="modal-root" />
      </body>
    </html>
  );
}
