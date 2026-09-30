import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared editorial primitives for the Welcome Page.
 *
 * These implement the design.md language once so every section stays
 * consistent: tiny uppercase eyebrows, quiet thin headings, restrained
 * square-ish geometry, arrow text links, and generous rhythm.
 * (design.md §4, §9, §12, §30, §31, §36.)
 */

/** Editorial container — restrained max width with visible white margins. */
export function EditorialContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-6 md:px-10 lg:px-16", className)}>
      {children}
    </div>
  );
}

/** Tiny uppercase micro-label (design.md §9). */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

/**
 * Large thin section heading. Regular weight, tight leading, slightly negative
 * tracking — hierarchy through scale, not boldness (design.md §2.1).
 */
export function SectionTitle({
  children,
  as: Tag = "h2",
  className,
}: {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        "text-[2rem] leading-[1.08] font-normal tracking-[-0.03em] text-brand-950 md:text-[2.5rem] lg:text-[3rem]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Quiet supporting copy with an editorial measure (§11). */
export function Lede({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[15px] leading-[1.55] text-brand-500 md:text-base",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * Minimal text link with the 4px arrow nudge on hover (design.md §12).
 * Renders as a real <Link> so keyboard and screen-reader behavior are native.
 */
export function EditorialLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/link inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-900 transition-colors duration-200 hover:text-action-700",
        className,
      )}
    >
      {children}
      <ArrowRight
        className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  );
}

/** Hairline horizontal rule used as a quiet section divider. */
export function EditorialRule({ className }: { className?: string }) {
  return <hr className={cn("border-t border-brand-200", className)} aria-hidden="true" />;
}
