"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PRIVACY_SECTIONS, type PrivacySection } from "@/lib/privacy-policy";
import { cn } from "@/lib/utils";

/**
 * Numbered table of contents for the Privacy Policy documentation page.
 *
 * Renders each top-level section as a clickable row. Clicking scrolls the
 * document panel (targetRef) directly to the section heading rather than
 * triggering a full page reload.
 *
 * As the user scrolls the panel, the active item updates via IntersectionObserver
 * attached to each section heading. This avoids expensive scroll listeners and
 * respects prefers-reduced-motion.
 */
export function PolicyTableOfContents({
  targetRef,
  sections = PRIVACY_SECTIONS,
}: {
  targetRef: React.RefObject<HTMLDivElement | null>;
  sections?: PrivacySection[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRefs = useRef<(IntersectionObserver | null)[]>([]);

  const scrollToSection = useCallback(
    (id: string) => {
      const panel = targetRef.current || document.querySelector<HTMLDivElement>("#privacy-policy-content");
      if (!panel) return;
      const target = panel.querySelector(`#${CSS.escape(id)}`);
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(id);
      }
    },
    [targetRef],
  );

  // Observe section headings inside the scroll panel to track the active section.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const setupObserver = () => {
      const panel = targetRef.current || document.querySelector<HTMLDivElement>("#privacy-policy-content");
      if (!panel) return false;

      // Clean up any previous observer
      observerRefs.current.forEach((o) => o?.disconnect());
      observerRefs.current = [];

      const observerOptions = {
        root: panel,
        rootMargin: "-20% 0px -65% 0px",
        threshold: 0.1,
      };

      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveId(entry.target.id);
          }
        }
      }, observerOptions);

      const headings = panel.querySelectorAll("h2[id]");
      headings.forEach((h) => observer.observe(h as Element));
      observerRefs.current = [observer];
      return true;
    };

    if (!setupObserver()) {
      intervalId = setInterval(() => {
        if (setupObserver()) {
          if (intervalId) clearInterval(intervalId);
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      observerRefs.current.forEach((o) => o?.disconnect());
      observerRefs.current = [];
    };
  }, [targetRef, sections]);

  return (
    <nav aria-label="Table of contents" className="flex flex-col gap-0.5">
      <h2 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.15em] text-brand-400">
        On this page
      </h2>
      {sections.map((section) => {
        const active = activeId === section.id;
        const number = section.heading.split(".")[0];
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(section.id);
            }}
            className={cn(
              "group relative flex items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors duration-150",
              active
                ? "bg-brand-50 text-brand-900"
                : "text-[#475569] hover:bg-brand-50/60 hover:text-brand-900",
            )}
            aria-current={active ? "location" : undefined}
          >
            {/* Active indicator line */}
            <span
              className={cn(
                "absolute left-0 top-1.5 h-5 w-[3px] rounded-full transition-colors",
                active ? "bg-brand-600" : "bg-transparent",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "mt-0.5 shrink-0 min-w-[1.3rem] text-[11px] font-extrabold leading-none tracking-tight select-none",
                active ? "text-brand-600" : "text-brand-400",
              )}
            >
              {number}
            </span>
            <span className="min-w-0 text-[13px] leading-snug font-medium truncate">
              {section.heading.split(". ").slice(1).join(". ") || section.heading}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
