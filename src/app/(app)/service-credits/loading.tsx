import { SkeletonBase } from "@/components/loading/skeletons";

export default function ServiceCreditsOverviewLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading service credits overview">
      {/* Header skeleton */}
      <div className="space-y-2">
        <SkeletonBase shimmer className="h-3 w-24" />
        <SkeletonBase shimmer className="h-7 w-80 max-w-full" />
        <SkeletonBase shimmer className="h-3.5 w-96 max-w-full" />
      </div>

      {/* Summary card skeletons */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-brand-200 bg-white shadow-xs px-4 py-3.5"
          >
            <SkeletonBase shimmer className="h-2.5 w-16" />
            <SkeletonBase shimmer className="h-6 w-20 mt-2" />
          </div>
        ))}
      </div>

      {/* Filter bar skeleton */}
      <div className="rounded-lg border border-brand-200 bg-white shadow-xs px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <SkeletonBase shimmer className="h-8 w-56 rounded-md" />
          <SkeletonBase shimmer className="h-8 w-28 rounded-md" />
          <SkeletonBase shimmer className="h-8 w-28 rounded-md" />
          <SkeletonBase shimmer className="h-8 w-28 rounded-md" />
          <SkeletonBase shimmer className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Table row skeletons */}
      <div className="overflow-hidden rounded-lg border border-brand-200 bg-white shadow-xs">
        <div className="border-b border-brand-100 px-4 py-3 flex items-center justify-between">
          <SkeletonBase shimmer className="h-4 w-24" />
          <SkeletonBase shimmer className="h-4 w-16" />
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-brand-100 last:border-b-0">
                <td className="px-4 py-3"><SkeletonBase shimmer className="h-3.5 w-24" /></td>
                <td className="px-4 py-3"><SkeletonBase shimmer className="h-3.5 w-40" /></td>
                <td className="px-4 py-3"><SkeletonBase shimmer className="h-3.5 w-28" /></td>
                <td className="px-4 py-3"><SkeletonBase shimmer className="h-4 w-16 rounded-full" /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <SkeletonBase shimmer className="h-4 w-16 rounded-full" />
                    <SkeletonBase shimmer className="h-4 w-16 rounded-full" />
                    <SkeletonBase shimmer className="h-4 w-16 rounded-full" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
