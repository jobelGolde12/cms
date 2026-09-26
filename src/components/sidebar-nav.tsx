"use client";

import { createElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navIcon } from "./nav-icons";

export type SidebarSection = { heading: string; items: string[] };
export type SidebarLink = { label: string; href: string; icon: string };

/**
 * Grouped sidebar navigation. Rendered inside the desktop sidebar and reused
 * by the mobile drawer so both stay visually identical. Items whose href is
 * not in the visible links (permission-filtered) are skipped automatically.
 */
export function SidebarNav({
  sections,
  links,
  onNavigate,
}: {
  sections: SidebarSection[];
  links: SidebarLink[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Application navigation"
      className="flex-1 overflow-y-auto px-3 py-3"
    >
      {sections.map((section) => {
        const items = section.items
          .map((href) => links.find((l) => l.href === href))
          .filter((l): l is SidebarLink => Boolean(l));
        if (items.length === 0) return null;

        return (
          <div key={section.heading} className="mb-4 last:mb-0">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-400">
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {items.map((link) => {
                const active =
                  pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-brand-900 text-white shadow-sm"
                          : "text-brand-700 hover:bg-slate-100 hover:text-brand-900",
                      )}
                    >
                      {createElement(navIcon(link.icon), {
                        className: "h-4 w-4 shrink-0",
                      })}
                      <span className="truncate">{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
