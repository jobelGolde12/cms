import { cn } from "@/lib/utils";

/**
 * Modern shimmer skeleton animation — softer than pulse, more modern.
 */
export function shimmerClass() {
  return "bg-gradient-to-r from-brand-200/40 via-brand-100 to-brand-200/40 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]";
}

export function SkeletonBase({
  className,
  shimmer = false,
}: {
  className?: string;
  shimmer?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md",
        shimmer ? shimmerClass() : "animate-pulse bg-brand-200/70",
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Page-level skeletons                                                      */
/* -------------------------------------------------------------------------- */

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <SkeletonBase shimmer className="h-2.5 w-40" />
          <SkeletonBase shimmer className="h-7 w-72" />
          <SkeletonBase shimmer className="h-3.5 w-96 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-brand-200 bg-white px-4 py-3.5 shadow-xs">
            <SkeletonBase shimmer className="h-2.5 w-20" />
            <SkeletonBase shimmer className="mt-2 h-8 w-16" />
            <SkeletonBase shimmer className="mt-2 h-2 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="rounded-lg border border-brand-200 bg-white shadow-xs p-4 space-y-3">
            <SkeletonBase shimmer className="h-4 w-48" />
            <SkeletonBase shimmer className="h-2 w-full max-w-xs" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 pt-2">
                <SkeletonBase shimmer className="h-1.5 w-1.5 rounded-full shrink-0" />
                <SkeletonBase shimmer className="h-3 w-32" />
                <SkeletonBase shimmer className="h-2 flex-1 rounded-full" />
                <SkeletonBase shimmer className="h-3 w-8" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-brand-200 bg-white shadow-xs p-4 space-y-3">
            <SkeletonBase shimmer className="h-4 w-56" />
            <SkeletonBase shimmer className="h-2 w-full max-w-xs" />
            <SkeletonBase shimmer className="h-48 w-full" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-lg border border-brand-200 bg-white shadow-xs p-4 space-y-3">
            <SkeletonBase shimmer className="h-4 w-40" />
            <SkeletonBase shimmer className="h-2 w-full max-w-xs" />
            <SkeletonBase shimmer className="h-24 w-full" />
          </div>
          <div className="rounded-lg border border-brand-200 bg-white shadow-xs p-4 space-y-3">
            <SkeletonBase shimmer className="h-4 w-48" />
            <SkeletonBase shimmer className="h-2 w-full max-w-xs" />
            <SkeletonBase shimmer className="h-20 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegistryPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading registry">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <SkeletonBase shimmer className="h-2.5 w-40" />
          <SkeletonBase shimmer className="h-7 w-60" />
          <SkeletonBase shimmer className="h-3.5 w-80 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-brand-200 bg-white px-4 py-3.5 shadow-xs">
            <SkeletonBase shimmer className="h-2.5 w-16" />
            <SkeletonBase shimmer className="mt-2 h-7 w-12" />
            <SkeletonBase shimmer className="mt-2 h-2 w-full" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <div className="border-b border-brand-100 px-4 py-3">
          <SkeletonBase shimmer className="h-4 w-32" />
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <SkeletonBase shimmer className="h-2.5 w-20 mb-1" />
                <SkeletonBase shimmer className="h-9 w-full" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBase shimmer key={i} className="h-7 w-16 rounded-full" />
              ))}
            </div>
            <SkeletonBase shimmer className="h-8 w-24 rounded-md" />
          </div>
        </div>
      </div>
      <section className="rounded-lg border border-brand-200 bg-white shadow-xs overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead><tr className="bg-brand-100/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <th key={i} className="px-4 py-2.5"><SkeletonBase shimmer className="h-3 w-16" /></th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-brand-100">
            {Array.from({ length: 8 }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: 8 }).map((_, c) => (
                  <td key={c} className="px-4 py-2.5"><SkeletonBase shimmer className="h-4 w-full" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function ValidationPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading validation queue">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <SkeletonBase shimmer className="h-2.5 w-40" />
          <SkeletonBase shimmer className="h-7 w-52" />
          <SkeletonBase shimmer className="h-3.5 w-72 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-brand-200 bg-white px-4 py-3.5 shadow-xs">
            <SkeletonBase shimmer className="h-2.5 w-20" />
            <SkeletonBase shimmer className="mt-2 h-8 w-14" />
            <SkeletonBase shimmer className="mt-1 h-2 w-full" />
          </div>
        ))}
      </div>
      <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 px-4 py-3">
          <SkeletonBase shimmer className="h-4 w-36" />
          <SkeletonBase shimmer className="h-8 w-48 rounded-md" />
        </div>
        <ul className="divide-y divide-brand-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 space-y-2">
                <SkeletonBase shimmer className="h-3 w-40" />
                <SkeletonBase shimmer className="h-3.5 w-56" />
                <SkeletonBase shimmer className="h-2.5 w-48" />
              </div>
              <div className="flex gap-2">
                <SkeletonBase shimmer className="h-7 w-14 rounded-md" />
                <SkeletonBase shimmer className="h-7 w-24 rounded-md" />
                <SkeletonBase shimmer className="h-7 w-16 rounded-md" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function ReportsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading reports">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <SkeletonBase shimmer className="h-2.5 w-32" />
          <SkeletonBase shimmer className="h-7 w-48" />
          <SkeletonBase shimmer className="h-3.5 w-80 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-brand-200 bg-white shadow-xs p-4 space-y-3">
            <SkeletonBase shimmer className="h-3.5 w-36" />
            <SkeletonBase shimmer className="h-12 w-full" />
            <div className="flex gap-2 pt-2">
              <SkeletonBase shimmer className="h-7 w-16 rounded-md" />
              <SkeletonBase shimmer className="h-7 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <div className="border-b border-brand-100 px-4 py-3">
          <SkeletonBase shimmer className="h-4 w-40" />
        </div>
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead><tr className="bg-brand-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <th key={i} className="px-4 py-2.5"><SkeletonBase shimmer className="h-3 w-12" /></th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-brand-100">
            {Array.from({ length: 5 }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: 4 }).map((_, c) => (
                  <td key={c} className="px-4 py-2.5"><SkeletonBase shimmer className="h-3.5 w-full" /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component-level skeletons                                                 */
/* -------------------------------------------------------------------------- */

export function StatsCardSkeleton() {
  return (
    <article className="rounded-lg border border-brand-200 bg-white px-4 py-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <SkeletonBase shimmer className="h-2.5 w-20" />
        <SkeletonBase shimmer className="h-7 w-7 rounded-md" />
      </div>
      <SkeletonBase shimmer className="mt-1.5 h-8 w-14" />
      <SkeletonBase shimmer className="mt-0.5 h-2 w-full" />
    </article>
  );
}

export function PanelSkeleton({ titleWidth = 48 }: { titleWidth?: number }) {
  return (
    <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
      <header className="flex items-start justify-between gap-3 border-b border-brand-100 px-4 py-3">
        <div className="min-w-0 space-y-1">
          <SkeletonBase shimmer className={`h-4 w-[${titleWidth}px]`} />
          <SkeletonBase shimmer className="h-2.5 w-24" />
        </div>
        <SkeletonBase shimmer className="h-6 w-12 rounded-md" />
      </header>
      <div className="px-4 py-3 space-y-2">
        <SkeletonBase shimmer className="h-2 w-full max-w-xs" />
        <SkeletonBase shimmer className="h-16 w-full" />
      </div>
    </section>
  );
}

export function TableRowSkeleton() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, c) => (
        <td key={c} className="px-4 py-2.5">
          <SkeletonBase shimmer className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SearchBarSkeleton() {
  return (
    <div className="rounded-lg border border-brand-200 bg-white shadow-xs p-4 space-y-3">
      <SkeletonBase shimmer className="h-3.5 w-20" />
      <SkeletonBase shimmer className="h-9 w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <SkeletonBase shimmer className="h-2.5 w-16 mb-1" />
            <SkeletonBase shimmer className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PaginationSkeleton() {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-brand-100 px-4 py-3 sm:flex-row">
      <SkeletonBase shimmer className="h-3.5 w-48" />
      <div className="flex items-center gap-1">
        <SkeletonBase shimmer className="h-8 w-8 rounded-md" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBase shimmer key={i} className="h-8 w-8 rounded-md" />
        ))}
        <SkeletonBase shimmer className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}
