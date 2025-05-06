import { useState, useEffect } from "react";

export function useDomain() {
  const [isAppLocal, setIsAppLocal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;

      // In development, consider localhost as app.local for testing
      const isDevelopment = process.env.NODE_ENV === "development";
      const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

      setIsAppLocal(hostname === "app.local" || (isDevelopment && isLocalhost));
    }
  }, []);

  return { isAppLocal };
}
