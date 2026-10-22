"use client";

import { useEffect, useRef } from "react";
import { PRIVACY_SECTIONS, PRIVACY_METADATA, type PrivacySection } from "@/lib/privacy-policy";
import { cn } from "@/lib/utils";

export interface PolicyMetadata {
  version: string;
  effectiveDate: string;
  lastUpdatedDate: string;
  title: string;
}

/**
 * Renders the complete Privacy Policy inside an independently scrollable
 * document panel. Each section has a stable HTML id so sidebar links can
 * scroll the panel directly to the target heading.
 */
export function PolicyContent({
  sections = PRIVACY_SECTIONS,
  metadata = PRIVACY_METADATA,
}: {
  sections?: PrivacySection[];
  metadata?: PolicyMetadata;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const target = panel.querySelector(`#${CSS.escape(hash)}`);
      if (target instanceof HTMLElement) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, []);

  return (
    <article
      ref={panelRef}
      id="privacy-policy-content"
      aria-labelledby="privacy-policy-title"
      className={cn(
        "scrollbar-thin relative h-full overflow-y-auto",
        "scroll-behavior-smooth",
      )}
    >
      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10 sm:py-10">
        <div className="mb-10 border-b border-brand-200 pb-8">
          <h1
            id="privacy-policy-title"
            className="text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl"
          >
            {metadata.title || "Privacy Policy"}
          </h1>
          <p className="mt-3 text-base text-[#475569] leading-relaxed max-w-2xl">
            How Sta. Magdalena National High School handles personal information in the Records Management System.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#64748B]">
            <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-widest text-brand-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
              Rev {metadata.version}
            </span>
            <span className="hidden h-3.5 w-px bg-brand-200 sm:block" />
            <span>
              Effective{" "}
              <span className="font-semibold text-brand-800">{metadata.effectiveDate}</span>
            </span>
            <span className="hidden h-3.5 w-px bg-brand-200 sm:block" />
            <span>
              Updated{" "}
              <span className="font-semibold text-brand-800">{metadata.lastUpdatedDate}</span>
            </span>
          </div>
        </div>

        <div className="space-y-14">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-8">
              <h2 className="text-xl font-extrabold tracking-tight text-brand-900 sm:text-2xl">
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.85] text-[#334155]">
                {section.paragraphs.map((paragraph, idx) => (
                  <p key={idx} className="text-[#334155]">
                    {paragraph}
                  </p>
                ))}
              </div>

              {section.subSections && section.subSections.length > 0 ? (
                <div className="mt-7 space-y-7">
                  {section.subSections.map((sub) => (
                    <div key={sub.heading} className="pl-0">
                      <h3 className="text-base font-bold text-brand-900">{sub.heading}</h3>
                      <ul className="mt-3 list-inside list-disc space-y-2.5 pl-1 text-[15px] text-[#334155] leading-[1.75]">
                        {sub.items.map((item, idx) => (
                          <li key={idx} className="leading-[1.75]">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <footer className="mt-16 border-t border-brand-200 pt-8 text-xs text-[#64748B] leading-relaxed">
          <p>
            This policy is a living document. For the current version, effective date, and last-updated date,
            see the policy header above. This document describes the system&apos;s technical and operational
            practices as implemented; it is not a substitute for professional legal review.
          </p>
        </footer>
      </div>
    </article>
  );
}
