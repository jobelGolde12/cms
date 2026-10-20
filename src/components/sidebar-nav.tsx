"use client";

import { createElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navIcon } from "./nav-icons";

export type SidebarSection = { heading: string; items: string[] };
export type SidebarLink = { label: string; href: string; icon: string };

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
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#AFC4FF]">
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
                      prefetch={true}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-all duration-200 ease-out",
                        active
                          ? "bg-[#315EF7] text-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] translate-x-[1px]"
                          : "text-[#E7EDFF] hover:bg-[#203B7A] hover:text-white hover:translate-x-[1px]",
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
