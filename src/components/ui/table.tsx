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
        "border-b border-[#DCE4F0] bg-[#EEF4FF]/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#14295F]",
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
  align = "left",
  title,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
  align?: "left" | "right";
  title?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      title={title}
      className={cn(
        "border-b border-[#DCE4F0] px-4 py-2.5 text-[13px] text-[#263449]",
        align === "right" && "text-right",
        className,
      )}
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
