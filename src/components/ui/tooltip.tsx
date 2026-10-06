import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("group/tooltip relative inline-flex", className)}
      aria-label={content}
    >
      <span
        className={cn(
          "pointer-events-none absolute z-50 bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-brand-900 px-2 py-1 text-[11px] font-medium text-white shadow-xl opacity-0 transition-all duration-200 ease-out",
          "group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 translate-y-0.5",
          "group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:translate-y-0",
        )}
        role="tooltip"
      >
        {content}
      </span>
      {children}
    </span>
  );
}
