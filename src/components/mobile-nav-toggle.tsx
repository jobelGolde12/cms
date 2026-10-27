"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { SidebarNav, type SidebarLink, type SidebarSection } from "./sidebar-nav";

/**
 * Mobile navigation: hamburger button + slide-in drawer with overlay.
 * The drawer closes on navigation, on backdrop tap, and with Escape.
 * While closed the panel is `inert` so its links stay out of the tab
 * order and out of the accessibility tree.
 */
export function MobileNavToggle({
  sections,
  links,
}: {
  sections: SidebarSection[];
  links: SidebarLink[];
}) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Escape closes the drawer while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the close button on open; restore focus to the toggle on close.
  useEffect(() => {
    if (open) {
      // Wait a frame so the drawer is mounted and transition started.
      requestAnimationFrame(() => {
        drawerRef.current?.querySelector<HTMLElement>("[data-drawer-close]")?.focus();
      });
    }
  }, [open]);

  // Prevent background scrolling while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        ref={toggleRef}
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
          inert={!open}
          className={`fixed inset-0 z-50 lg:hidden transition-[opacity,backdrop-filter] duration-300 ease-in-out ${
            open ? "opacity-100 pointer-events-auto backdrop-blur-[2px]" : "opacity-0 pointer-events-none"
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
          ref={drawerRef}
          className={`absolute inset-y-0 left-0 flex w-64 transform flex-col bg-[#14295F] shadow-2xl transition-transform duration-300 ease-in-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-3 border-b border-[#203B7A]/40 px-4 py-4">
            {/* Brand mark — single source of truth (see components/logo.tsx). */}
            <Logo size="md" asLink tone="onDark" />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-xs font-bold uppercase tracking-wide text-white break-words">
                Sta. Magdalena
              </div>
              <div className="text-[11px] font-medium text-[#AFC4FF]">Records Management</div>
            </div>
            <button
              type="button"
              data-drawer-close
              onClick={() => {
                setOpen(false);
                toggleRef.current?.focus();
              }}
              aria-label="Close navigation menu"
              className="inline-flex items-center justify-center rounded-md p-2 text-[#D7E2FF] transition-colors hover:bg-[#203B7A] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <SidebarNav sections={sections} links={links} onNavigate={() => setOpen(false)} />

          <div className="border-t border-[#203B7A]/40 px-4 py-3 text-[11px] text-[#AFC4FF]">
            Sta. Magdalena NHS • School Records System
          </div>
        </div>
      </div>
    </>
  );
}
