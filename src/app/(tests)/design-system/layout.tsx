"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function DesignSystemLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <div className="container mx-auto py-4">
      <div className="mb-6">
        <Link href="/" className="text-blue-500 hover:underline">
          ← Back to Home
        </Link>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Components</TabsTrigger>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div className="mt-6">{children}</div>
        </TabsContent>
        <TabsContent value="inputs">
          <div className="mt-6 text-center py-10">
            <h2 className="text-2xl font-bold mb-2">Input Components</h2>
            <p className="text-gray-500">
              This tab would show only input-related components.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="display">
          <div className="mt-6 text-center py-10">
            <h2 className="text-2xl font-bold mb-2">Display Components</h2>
            <p className="text-gray-500">
              This tab would show only display-related components.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="navigation">
          <div className="mt-6 text-center py-10">
            <h2 className="text-2xl font-bold mb-2">Navigation Components</h2>
            <p className="text-gray-500">
              This tab would show only navigation-related components.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
