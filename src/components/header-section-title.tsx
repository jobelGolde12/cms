"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Contextual label for the authenticated header bar.
 *
 * The shell used to render `<h1>Dashboard</h1>` on every route, which was both
 * misleading (wrong section name) and an accessibility defect (a second top-level
 * heading next to each page's own `<h1>`). This renders the active navigation
 * section as a non-heading label instead — the page's own heading remains the
 * single `<h1>`.
 */
export function HeaderSectionTitle({
  links,
  className,
}: {
  links: { label: string; href: string }[];
  className?: string;
}) {
  const pathname = usePathname();
  const active = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    // Longest href wins so the most specific section is chosen.
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <p
      className={cn(
        "truncate text-sm font-semibold text-brand-900 sm:text-base md:text-lg",
        className,
      )}
    >
      {active?.label ?? "Dashboard"}
    </p>
  );
}
