"use client";

import { useEffect, useState } from "react";

export default function TestSubdomainPage() {
  const [host, setHost] = useState<string>("");
  const [pathname, setPathname] = useState<string>("");

  useEffect(() => {
    setHost(window.location.host);
    setPathname(window.location.pathname);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Subdomain Routing Test Page</h1>
      <div className="bg-gray-100 p-4 rounded mb-4">
        <p>
          <strong>Host:</strong> {host}
        </p>
        <p>
          <strong>Pathname:</strong> {pathname}
        </p>
        <p>
          <strong>Full URL:</strong>{" "}
          {typeof window !== "undefined" ? window.location.href : ""}
        </p>
      </div>
      <div className="mt-6">
        <p>
          If you see this page on app.localhost:3001, subdomain routing is
          working!
        </p>
      </div>
      <div className="mt-6">
        <a
          href="http://localhost:3001"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mr-4"
        >
          Go to Landing Page
        </a>
        <a
          href="http://app.localhost:3001/dashboard"
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
