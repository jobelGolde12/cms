"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useInView — one-shot IntersectionObserver hook for scroll-triggered
 * entrance animations (chart bars, count-ups). Flips to `true` the first time
 * the element enters the viewport and stays true. Falls back to `true` when
 * IntersectionObserver is unavailable so content still renders.
 */
export function useInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect();
          setInView(true);
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
