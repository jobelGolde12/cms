"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "./use-in-view";

/**
 * CountUp — count-up-from-zero for metric numbers.
 *
 * SSR-safe: renders "0" (the server-rendered markup starts at 0), then animates
 * to the real value the first time the element scrolls into view. Respects
 * `prefers-reduced-motion` by snapping straight to the final value. Used by the
 * KPI cards, distribution rows and the operational banner.
 */
export function CountUp({
  value,
  className,
  duration = 700,
  delay = 0,
}: {
  value: number;
  className?: string;
  duration?: number;
  delay?: number;
}) {
  const startedRef = useRef(false);
  const [display, setDisplay] = useState(0);
  const { ref, inView } = useInView<HTMLSpanElement>();

  // Animate 0 → value once, on a delayed cubic ease-out curve.
  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || duration <= 0) {
      const timer = window.setTimeout(() => setDisplay(value), 0);
      return () => window.clearTimeout(timer);
    }

    let raf = 0;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
        setDisplay(Math.round(value * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [inView, value, duration, delay]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
