"use client";

import { useState } from "react";
import { Menu, UsersRound, X } from "lucide-react";
import { SidebarNav, type SidebarLink, type SidebarSection } from "./sidebar-nav";

/**
 * Mobile navigation: hamburger button + slide-in drawer with overlay.
 * The drawer closes on navigation and on backdrop tap.
 */
export function MobileNavToggle({
  sections,
  links,
}: {
  sections: SidebarSection[];
  links: SidebarLink[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-brand-900 transition-colors hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-brand-950/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        {/* Drawer — same institutional styling as the desktop sidebar */}
        <div
          className={`absolute inset-y-0 left-0 flex w-64 transform flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-3 border-b border-[#e5e7eb] px-4 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-900">
              <UsersRound aria-hidden="true" className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-bold uppercase tracking-wide text-brand-900">
                Sta. Magdalena
              </div>
              <div className="text-[11px] font-medium text-brand-500">Child Mapping</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation menu"
              className="inline-flex items-center justify-center rounded-md p-2 text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <SidebarNav sections={sections} links={links} onNavigate={() => setOpen(false)} />

          <div className="border-t border-[#e5e7eb] px-4 py-3 text-[11px] text-brand-400">
            Sorsogon • LGU / DepEd
          </div>
        </div>
      </div>
    </>
  );
}
