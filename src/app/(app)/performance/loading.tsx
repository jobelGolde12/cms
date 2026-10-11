import { SkeletonBase } from "@/components/loading/skeletons";

/** Route-level skeleton matching the /performance page structure. */
export default function PerformanceLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading performance overview">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <SkeletonBase shimmer className="h-2.5 w-40" />
          <SkeletonBase shimmer className="h-7 w-64" />
          <SkeletonBase shimmer className="h-3.5 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBase key={i} shimmer className="h-8 w-32 rounded-md" />
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <div className="border-b border-brand-100 px-4 py-3">
          <SkeletonBase shimmer className="h-4 w-36" />
        </div>
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="bg-brand-100/60">
              {Array.from({ length: 5 }).map((_, i) => (
                <th key={i} className="px-4 py-2.5">
                  <SkeletonBase shimmer className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {Array.from({ length: 6 }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: 5 }).map((_, c) => (
                  <td key={c} className="px-4 py-2.5">
                    <SkeletonBase shimmer className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-brand-200 bg-white shadow-xs p-4 space-y-3">
            <SkeletonBase shimmer className="h-4 w-44" />
            <SkeletonBase shimmer className="h-2.5 w-56" />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <SkeletonBase shimmer className="h-3 w-20" />
                <SkeletonBase shimmer className="h-2 flex-1 rounded-full" />
                <SkeletonBase shimmer className="h-3 w-8" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <div className="border-b border-brand-100 px-4 py-3">
          <SkeletonBase shimmer className="h-4 w-48" />
        </div>
        <div className="p-4 space-y-2.5">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="flex items-center gap-3">
              <SkeletonBase shimmer className="h-3 w-24" />
              <SkeletonBase shimmer className="h-2 flex-1 rounded-full" />
              <SkeletonBase shimmer className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
