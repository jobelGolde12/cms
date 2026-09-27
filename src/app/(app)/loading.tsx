import { TableSkeleton } from "@/components/ui/states";

/**
 * Route-level loading state for the authenticated app group (covers the
 * dashboard, registry, and validation pages). Uses the existing skeleton
 * primitives and design tokens.
 */
export default function AppLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading page">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="h-2.5 w-40 animate-pulse rounded bg-brand-200/70" />
          <div className="h-7 w-72 animate-pulse rounded bg-brand-200/70" />
          <div className="h-3.5 w-96 max-w-full animate-pulse rounded bg-brand-100" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-brand-200 bg-white px-4 py-3.5 shadow-xs">
            <div className="h-2.5 w-20 animate-pulse rounded bg-brand-200/70" />
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-brand-200/70" />
            <div className="mt-2 h-2 w-full animate-pulse rounded bg-brand-100" />
          </div>
        ))}
      </div>
      <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <TableSkeleton rows={6} cols={5} />
      </section>
    </div>
  );
}
