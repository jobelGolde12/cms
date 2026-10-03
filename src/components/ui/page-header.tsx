import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical page header for authenticated pages (see dashboard, registry and
 * validation headers for the origin of this pattern):
 *
 *   EYEBROW (tiny uppercase, action blue)
 *   Title   (bold, tracking-tight)
 *   Description (supporting copy)
 *   Actions (right-aligned stat chips / buttons on md+)
 *
 * Using one component keeps title scale, spacing and hierarchy identical
 * across pages that were previously hand-rolled with divergent styles.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]",
            eyebrow ? "mt-1" : null,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-brand-500">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
