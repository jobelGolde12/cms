import { SkeletonBase } from "@/components/loading/skeletons";

/**
 * Route-level loading state for the Guidance Office: header + filter row +
 * incident table rows matching the real columns
 * (student / type / incident / status / recorded).
 */
export default function GuidanceLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading guidance incidents">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <SkeletonBase shimmer className="h-2.5 w-36" />
          <SkeletonBase shimmer className="h-8 w-48" />
          <SkeletonBase shimmer className="h-3.5 w-96 max-w-full" />
        </div>
        <SkeletonBase shimmer className="h-9 w-36" />
      </div>

      {/* Filter panel skeleton (search + type + status) */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-brand-200 bg-white px-4 py-3 shadow-xs sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <SkeletonBase shimmer className="h-2.5 w-20" />
            <SkeletonBase shimmer className="mt-1.5 h-9 w-full" />
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-brand-200 bg-white shadow-xs overflow-x-auto">
        <div className="border-b border-brand-100 px-4 py-3 flex items-center justify-between gap-3">
          <div className="space-y-1.5">
            <SkeletonBase shimmer className="h-4 w-32" />
            <SkeletonBase shimmer className="h-2.5 w-48" />
          </div>
          <SkeletonBase shimmer className="h-8 w-24 rounded-md" />
        </div>
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="bg-[#EEF4FF]/40">
              {["Student", "Type", "Incident", "Status", "Recorded"].map((h) => (
                <th key={h} className="border-b border-[#DCE4F0] px-4 py-2.5">
                  <SkeletonBase shimmer className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {Array.from({ length: 8 }).map((_, r) => (
              <tr key={r}>
                <td className="px-4 py-2.5"><SkeletonBase shimmer className="h-4 w-44" /></td>
                <td className="px-4 py-2.5"><SkeletonBase shimmer className="h-4 w-28" /></td>
                <td className="px-4 py-2.5"><SkeletonBase shimmer className="h-4 w-64" /></td>
                <td className="px-4 py-2.5"><SkeletonBase shimmer className="h-4 w-20" /></td>
                <td className="px-4 py-2.5"><SkeletonBase shimmer className="h-4 w-24" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
