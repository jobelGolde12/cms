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
      className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.22)_transparent] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb:hover]:bg-white/25"
    >
      {sections.map((section) => {
        const items = section.items
          .map((href) => links.find((l) => l.href === href))
          .filter((l): l is SidebarLink => Boolean(l));
        if (items.length === 0) return null;

        return (
          <div key={section.heading} className="mb-5 last:mb-0">
            <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#7EA2FF]/80">
              {section.heading}
            </p>
            <ul className="space-y-px">
              {items.map((link) => {
                const active =
                  pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <li key={link.href} className="relative">
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-white/80"
                      />
                    ) : null}
                    <Link
                      href={link.href}
                      prefetch={true}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-9 items-center gap-2.5 rounded-md pl-3.5 pr-2.5 text-[13px] transition-colors duration-150",
                        active
                          ? "bg-white/10 font-semibold text-white"
                          : "font-normal text-[#C9D6F5] hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      {createElement(navIcon(link.icon), {
                        className: cn(
                          "h-4 w-4 shrink-0",
                          active ? "opacity-100" : "opacity-75",
                        ),
                      })}
                      <span className="block min-w-0">{link.label}</span>
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
