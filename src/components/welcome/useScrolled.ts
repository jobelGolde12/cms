"use client";

import { useEffect, useState } from "react";

/**
 * Returns true once the page has scrolled past `threshold` px.
 *
 * Uses a passive scroll listener + rAF throttle — the welcome page is a
 * Server Component tree, so this is the only piece of client JS the header
 * needs, and it renders no DOM of its own.
 */
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return scrolled;
}
