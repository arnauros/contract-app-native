import { useState, useEffect } from "react";

export function useDomain() {
  const [isLocalDevelopment, setIsLocalDevelopment] = useState(false);
  const [currentPort, setCurrentPort] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const port = window.location.port;
      const protocol = window.location.protocol;

      // Check if we're in a local development environment
      const isDevelopment = process.env.NODE_ENV === "development";
      const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

      setIsLocalDevelopment(isDevelopment && isLocalhost);
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
    isLocalDevelopment,
    currentPort,
    baseUrl,
    createUrl,
  };
}
