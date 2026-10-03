import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section card — the same white panel used by the dashboard's <Panel> and the
 * registry/validation pages (rounded-lg, hairline brand border, xs shadow).
 * CardHeader mirrors the dashboard panel header so cards look identical
 * wherever they appear.
 */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-brand-200 bg-white shadow-xs",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-brand-100 px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icon ? (
          <span aria-hidden="true" className="shrink-0 text-brand-500">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-brand-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-brand-500">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("px-4 py-3", className)}>{children}</div>;
}
