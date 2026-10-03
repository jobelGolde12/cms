"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Subtle content transition wrapper for dashboard pages.
 * Provides a quick fade-in when content replaces skeleton state,
 * without blocking navigation or causing layout jumps.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay allows skeleton-to-content transition to feel natural
    const timer = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      className="transition-all duration-300 ease-out"
      style={{
        opacity: mounted ? 1 : 0.85,
        transform: mounted ? "translateY(0)" : "translateY(4px)",
      }}
      aria-live="polite"
      aria-busy={!mounted ? "true" : undefined}
    >
      {children}
    </div>
  );
}
