import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./states";

/**
 * Shared data-table primitives matching the registry/validation table style:
 * sticky-feeling uppercase headers on a tinted band, hairline row dividers,
 * and a consistent empty-state row.
 */
export function TableWrap({
  children,
  minWidth = 720,
  className,
}: {
  children: ReactNode;
  minWidth?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table
        className="w-full border-collapse text-left text-sm"
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-brand-100 bg-brand-100/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("border-b border-brand-100 px-4 py-2.5 text-[13px] text-brand-800", className)}
    >
      {children}
    </td>
  );
}

/**
 * Empty-state row for tables: reuses the app's EmptyState so "no data"
 * messaging looks identical everywhere (icon + title + guidance).
 */
export function TableEmptyState({
  colSpan,
  icon,
  title,
  description,
  action,
}: {
  colSpan: number;
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-2">
        <EmptyState icon={icon} title={title} description={description} action={action} />
      </td>
    </tr>
  );
}
