import Image from "next/image";
import Link from "next/link";
import { SCHOOL } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  <Logo /> — SINGLE SOURCE OF TRUTH for the site-wide brand mark
 * ─────────────────────────────────────────────────────────────────────────────
 *  ALL logo usage must flow through this component. Headers, footers,
 *  sidebars, dashboards, auth pages, error/loading pages — everything renders
 *  <Logo />; nothing else may reference the brand asset, its path, or
 *  "/logo.png" directly. If the brand mark ever changes, this file is the only
 *  one that needs updating (plus `pnpm brand:icons` to refresh the favicon
 *  derivatives — see scripts/generate-brand-icons.mts).
 *
 *  Props:
 *  - size     Sizing token shared by every surface (sm | md | lg | xl | hero).
 *  - variant  "mark" (icon only) or "lockup" (mark + institutional wordmark
 *             text). The canonical asset is a square emblem, so a full
 *             wordmark is composed from text rather than a second asset.
 *  - tone     "auto" (default) or "onDark". The app is light-theme only (no
 *             dark: variants / theme toggle exist), so "auto" always renders
 *             the standard mark; "onDark" frames the mark in a rounded white
 *             tile with a subtle ring so it stays legible on dark navy
 *             surfaces such as the welcome CTA section.
 *  - asLink   Wraps in a link to "/" for navigation contexts (headers,
 *             sidebars, footers) with an accessible "Home" destination.
 *  - priority Forwarded to next/image for above-the-fold rendering.
 *
 *  Works in both Server and Client Components (no "use client" needed, and
 *  the static import keeps dimensions inferred at build time — no layout
 *  shift, no distortion: the square asset always renders 1:1).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// The canonical brand asset. This is the ONLY image reference to the logo in
// the entire codebase — never import or link the asset anywhere else.
import brandMark from "../../public/logo.png";

/**
 * Re-exported EXCLUSIVELY for the metadata configuration in src/app/layout.tsx
 * (Open Graph / Twitter card images). Never use this in UI — render <Logo />.
 */
export const logoImage = brandMark;

export const BRAND_NAME = `${SCHOOL.shortName} Records Management System`;

/** Sizing tokens — headers, footers, sidebars, and auth pages share one scale. */
const SIZE_STYLES = {
  sm: { px: 24, className: "h-6 w-6", sizes: "24px" },
  md: { px: 32, className: "h-8 w-8", sizes: "32px" },
  lg: { px: 40, className: "h-10 w-10", sizes: "40px" },
  xl: { px: 48, className: "h-12 w-12", sizes: "48px" },
  hero: {
    px: 96,
    className: "h-20 w-20 md:h-24 md:w-24",
    sizes: "(min-width: 768px) 96px, 80px",
  },
} as const;

export type LogoSize = keyof typeof SIZE_STYLES;

export type LogoProps = {
  size?: LogoSize;
  variant?: "mark" | "lockup";
  tone?: "auto" | "onDark";
  asLink?: boolean;
  className?: string;
  priority?: boolean;
};

export function Logo({
  size = "md",
  variant = "mark",
  tone = "auto",
  asLink = false,
  className,
  priority = false,
}: LogoProps) {
  const token = SIZE_STYLES[size];
  const onDark = tone === "onDark";

  const image = (
    <Image
      src={brandMark}
      alt={variant === "lockup" ? "" : BRAND_NAME}
      width={token.px}
      height={token.px}
      sizes={token.sizes}
      priority={priority}
      className={cn(
        "shrink-0 select-none",
        token.className,
        onDark && "rounded-lg shadow-sm ring-1 ring-white/15",
      )}
    />
  );

  const content =
    variant === "lockup" ? (
      <span className="inline-flex items-center gap-3">
        {image}
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              "block truncate text-[11px] font-extrabold uppercase tracking-[0.12em]",
              onDark ? "text-brand-200" : "text-brand-900",
            )}
          >
            {SCHOOL.shortName}
          </span>
          <span
            className={cn(
              "block truncate text-sm font-extrabold tracking-tight",
              onDark ? "text-white" : "text-brand-950",
            )}
          >
            Records Management System
          </span>
        </span>
      </span>
    ) : (
      image
    );

  if (!asLink) {
    return <span className={cn("inline-flex", className)}>{content}</span>;
  }

  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center rounded-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600",
        className,
      )}
    >
      {content}
      {variant === "mark" ? <span className="sr-only">— Home</span> : null}
    </Link>
  );
}
