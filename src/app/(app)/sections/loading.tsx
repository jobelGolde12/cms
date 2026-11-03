import { TableSkeleton } from "@/components/ui/states";

/** Route-level skeleton for the Section Management module. */
export default function SectionsLoading() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-brand-200 bg-white px-4 py-3 shadow-xs">
        <div className="h-3 w-24 animate-pulse rounded bg-brand-200/70" />
        <div className="mt-2 h-7 w-40 animate-pulse rounded bg-brand-200/70" />
      </div>
      <div className="h-16 animate-pulse rounded-lg bg-brand-200/50" />
      <div className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <TableSkeleton rows={8} cols={6} />
      </div>
    </div>
  );
}
