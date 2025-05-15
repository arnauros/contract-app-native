"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  // Only run on client side
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by using forcedTheme during SSR
  return (
    <NextThemesProvider
      {...props}
      enableSystem={mounted}
      forcedTheme={!mounted ? "light" : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
