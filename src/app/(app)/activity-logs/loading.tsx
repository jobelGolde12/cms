import { SkeletonBase } from "@/components/loading/skeletons";

/**
 * Route-level loading state for Activity Logs: header + audit table rows
 * matching the real columns (action / entity / user / time) plus pagination.
 */
export default function ActivityLogsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading activity logs">
      <div className="space-y-2">
        <SkeletonBase shimmer className="h-2.5 w-20" />
        <SkeletonBase shimmer className="h-8 w-44" />
        <SkeletonBase shimmer className="h-3.5 w-80 max-w-full" />
      </div>
      <section className="rounded-lg border border-brand-200 bg-white shadow-xs overflow-x-auto">
        <div className="border-b border-brand-100 px-4 py-3 flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <SkeletonBase shimmer className="h-4 w-32" />
            <SkeletonBase shimmer className="h-2.5 w-44" />
          </div>
        </div>
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="bg-[#EEF4FF]/40">
              {["Action", "Entity", "User", "Time"].map((h) => (
                <th key={h} className="border-b border-[#DCE4F0] px-4 py-2.5">
                  <SkeletonBase shimmer className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE4F0]">
            {Array.from({ length: 12 }).map((_, r) => (
              <tr key={r}>
                <td className="px-4 py-2.5"><SkeletonBase shimmer className="h-3.5 w-36" /></td>
                <td className="px-4 py-2.5"><SkeletonBase shimmer className="h-3.5 w-40" /></td>
                <td className="px-4 py-2.5"><SkeletonBase shimmer className="h-3.5 w-28" /></td>
                <td className="px-4 py-2.5"><SkeletonBase shimmer className="h-3.5 w-24" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
