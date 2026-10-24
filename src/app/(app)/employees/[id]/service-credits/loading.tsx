import { SkeletonBase } from "@/components/loading/skeletons";

export default function EmployeeServiceCreditsLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading service credit ledger">
      {/* Header skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <SkeletonBase shimmer className="h-3 w-32" />
          <SkeletonBase shimmer className="h-7 w-64 max-w-full" />
          <SkeletonBase shimmer className="h-3.5 w-80 max-w-full" />
        </div>
        <SkeletonBase shimmer className="h-8 w-40 rounded-md" />
      </div>

      {/* Summary card skeletons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-brand-200 bg-white shadow-xs px-4 py-3.5"
          >
            <SkeletonBase shimmer className="h-9 w-9 rounded-lg" />
            <div className="space-y-1.5">
              <SkeletonBase shimmer className="h-2.5 w-24" />
              <SkeletonBase shimmer className="h-5 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Ledger table skeleton */}
      <div className="overflow-hidden rounded-lg border border-brand-200 bg-white shadow-xs">
        <div className="border-b border-brand-100 px-4 py-3 flex items-center justify-between">
          <SkeletonBase shimmer className="h-4 w-32" />
          <div className="flex gap-2">
            <SkeletonBase shimmer className="h-6 w-24 rounded-md" />
            <SkeletonBase shimmer className="h-6 w-32 rounded-md" />
          </div>
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-brand-100 last:border-b-0">
                <td className="px-4 py-3"><SkeletonBase shimmer className="h-3.5 w-20" /></td>
                <td className="px-4 py-3"><SkeletonBase shimmer className="h-4 w-20 rounded-full" /></td>
                <td className="px-4 py-3"><SkeletonBase shimmer className="h-3.5 w-14" /></td>
                <td className="px-4 py-3"><SkeletonBase shimmer className="h-3.5 w-48" /></td>
                <td className="px-4 py-3"><SkeletonBase shimmer className="h-3.5 w-28" /></td>
                <td className="px-4 py-3"><SkeletonBase shimmer className="h-3.5 w-8" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
