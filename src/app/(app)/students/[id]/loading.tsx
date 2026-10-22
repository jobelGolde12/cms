import { SkeletonBase } from "@/components/loading/skeletons";

export default function StudentProfileLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading student profile">
      {/* Breadcrumb skeleton */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <SkeletonBase shimmer className="h-3 w-16" />
        <SkeletonBase shimmer className="h-3 w-3 rounded-full" />
        <SkeletonBase shimmer className="h-3 w-20" />
      </nav>

      {/* Header skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <SkeletonBase shimmer className="h-7 w-72 max-w-full" />
          <SkeletonBase shimmer className="h-3.5 w-48" />
        </div>
        <div className="flex shrink-0 gap-2">
          <SkeletonBase shimmer className="h-8 w-16 rounded-md" />
          <SkeletonBase shimmer className="h-8 w-20 rounded-md" />
          <SkeletonBase shimmer className="h-8 w-16 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* Main column skeleton */}
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
            <header className="border-b border-brand-100 px-4 py-3">
              <SkeletonBase shimmer className="h-4 w-28" />
            </header>
            <div className="px-4 py-4 sm:px-5">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <SkeletonBase shimmer className="h-2.5 w-16 mb-1" />
                    <SkeletonBase shimmer className="h-3.5 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
            <header className="border-b border-brand-100 px-4 py-3">
              <SkeletonBase shimmer className="h-4 w-16" />
            </header>
            <div className="px-4 py-3 sm:px-5">
              <ul className="divide-y divide-brand-100">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="space-y-1.5">
                      <SkeletonBase shimmer className="h-3.5 w-32" />
                      <SkeletonBase shimmer className="h-2.5 w-48" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
            <header className="border-b border-brand-100 px-4 py-3">
              <SkeletonBase shimmer className="h-4 w-36" />
            </header>
            <div className="px-4 py-3 sm:px-5">
              <ul className="divide-y divide-brand-100">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <SkeletonBase shimmer className="h-3.5 w-28" />
                      <SkeletonBase shimmer className="h-3 w-12" />
                    </div>
                    <SkeletonBase shimmer className="h-2.5 w-48 mt-1" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Side column skeleton */}
        <div className="space-y-5">
          <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
            <header className="flex items-start justify-between gap-3 border-b border-brand-100 px-4 py-3">
              <SkeletonBase shimmer className="h-4 w-36" />
            </header>
            <div className="px-4 py-3 space-y-2">
              <SkeletonBase shimmer className="h-2 w-full max-w-xs" />
              <SkeletonBase shimmer className="h-16 w-full" />
            </div>
          </section>

          <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
            <header className="border-b border-brand-100 px-4 py-3">
              <SkeletonBase shimmer className="h-4 w-36" />
            </header>
            <div className="px-4 py-3 space-y-2">
              <SkeletonBase shimmer className="h-2 w-full max-w-xs" />
              <SkeletonBase shimmer className="h-24 w-full" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
