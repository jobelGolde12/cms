"use client";

import { useState, useRef, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { PolicyTableOfContents } from "@/components/privacy/policy-table-of-contents";
import { PolicyContent } from "@/components/privacy/policy-content";
import { cn } from "@/lib/utils";
import type { PrivacySection } from "@/lib/privacy-policy";

interface PrivacyDocumentationLayoutProps {
  sections: PrivacySection[];
  metadata: {
    version: string;
    effectiveDate: string;
    lastUpdatedDate: string;
    title: string;
  };
}

export function PrivacyDocumentationLayout({
  sections,
  metadata,
}: PrivacyDocumentationLayoutProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollToSection = useCallback(
    (id: string) => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector(`#${CSS.escape(id)}`);
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setMobileOpen(false);
    },
    [],
  );

  return (
    <div className="flex gap-8 lg:gap-10">
      {/* Left sidebar — sticky navigation */}
      <aside className="hidden lg:block w-[260px] shrink-0">
        <div className="sticky top-[5.5rem]">
          <nav
            aria-label="Table of contents"
            className="rounded-xl border border-brand-200 bg-white/70 backdrop-blur-sm shadow-xs p-4"
          >
            <PolicyTableOfContents
              targetRef={panelRef}
              sections={sections}
            />
          </nav>
        </div>
      </aside>

      {/* Mobile TOC drawer */}
      <div className="lg:hidden mb-4 w-full">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open table of contents"
          aria-expanded={mobileOpen}
          aria-controls="mobile-toc-panel"
          className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-brand-900 shadow-sm hover:bg-brand-50 transition-colors"
        >
          <Menu className="h-4 w-4 text-brand-600" />
          <span>On this page</span>
        </button>

        <div
          id="mobile-toc-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Table of contents"
          className={cn(
            "fixed inset-0 z-50 lg:hidden transition-[opacity] duration-300",
            mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          )}
        >
          <div
            className="absolute inset-0 bg-brand-950/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              "absolute top-16 left-4 right-4 bg-white rounded-xl shadow-2xl border border-brand-200 max-h-[75vh] overflow-y-auto transition-transform duration-300 ease-out",
              mobileOpen ? "translate-y-0" : "-translate-y-4",
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-100">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.15em] text-brand-400">
                On this page
              </h3>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close table of contents"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-[#64748B] hover:text-brand-900 hover:bg-brand-50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-2 py-2">
              {sections.map((section) => {
                const number = section.heading.split(".")[0];
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(section.id);
                    }}
                    className="flex items-start gap-3 rounded-md px-2.5 py-2.5 text-[13px] text-[#475569] hover:bg-brand-50 hover:text-brand-900 transition-colors"
                  >
                    <span className="mt-0.5 shrink-0 text-[11px] font-extrabold text-brand-400 min-w-[1.3rem]">
                      {number}
                    </span>
                    <span className="leading-snug font-medium">
                      {section.heading.split(". ").slice(1).join(". ") || section.heading}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right content panel — independently scrollable */}
      <main className="flex-1 min-w-0">
        <div
          className="rounded-2xl border border-brand-200 bg-white shadow-sm overflow-hidden lg:h-[calc(100vh-11rem)]"
        >
          <PolicyContent
            sections={sections}
            metadata={metadata}
          />
        </div>
      </main>
    </div>
  );
}
