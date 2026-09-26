"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { navIcon } from "./nav-icons";

export function MobileNavToggle({
  links,
}: {
  links: { label: string; href: string; icon: string }[];
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
        className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 text-brand-900 hover:bg-brand-100 active:bg-brand-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-modal="true"
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        {/* Drawer */}
        <div
          className={`absolute top-0 left-0 h-full w-72 bg-brand-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-5 h-16 border-b border-brand-800">
            <span className="text-sm font-bold tracking-tight">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation menu"
              className="inline-flex items-center justify-center rounded-lg p-2 text-brand-300 hover:text-white hover:bg-brand-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="px-3 py-4 space-y-1 overflow-y-auto" aria-label="Mobile navigation">
            {links.map((link) => {
              const Icon = navIcon(link.icon);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-brand-200 hover:text-white hover:bg-brand-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
