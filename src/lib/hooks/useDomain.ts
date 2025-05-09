import { useState, useEffect } from "react";

export function useDomain() {
  const [isAppLocal, setIsAppLocal] = useState(false);
  const [currentPort, setCurrentPort] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const port = window.location.port;
      const protocol = window.location.protocol;

      // In development, consider localhost as app.local for testing
      const isDevelopment = process.env.NODE_ENV === "development";
      const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

      setIsAppLocal(
        hostname === "app.local" ||
          hostname.includes("app.localhost") ||
          (isDevelopment && isLocalhost)
      );
      setCurrentPort(port || null);

      // Set the base URL including the port
      const baseUrlWithPort = `${protocol}//${hostname}${
        port ? `:${port}` : ""
      }`;
      setBaseUrl(baseUrlWithPort);
    }
  }, []);

  // Helper to create full URLs that preserve the current port
  const createUrl = (path: string): string => {
    // Ensure path starts with a slash
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  };

  return {
    isAppLocal,
    currentPort,
    baseUrl,
    createUrl,
  };
}
