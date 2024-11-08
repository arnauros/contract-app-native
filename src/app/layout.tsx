"use client";

import { usePathname } from "next/navigation";
import Topbar from "@/app/Components/topbar";
import Sidebar from "@/app/Components/sidebar";
import "@/app/globals.css";

export default function RootLayout({ children }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My App</title>
      </head>
      <body className="bg-gray-100 text-gray-900">
        <div className="flex flex-col h-screen">
          <Topbar pathname={pathname} />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
