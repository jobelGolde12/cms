import { SkeletonBase } from "@/components/loading/skeletons";

/** Shared table-card skeleton for /development and /development/behavior. */
export default function DevelopmentLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading student development">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <SkeletonBase shimmer className="h-2.5 w-40" />
          <SkeletonBase shimmer className="h-7 w-60" />
          <SkeletonBase shimmer className="h-3.5 w-96 max-w-full" />
        </div>
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-brand-200 bg-white shadow-xs">
          <div className="border-b border-brand-100 px-4 py-3">
            <SkeletonBase shimmer className="h-4 w-36" />
            <SkeletonBase shimmer className="mt-1.5 h-2.5 w-64" />
          </div>
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-brand-100/60">
                {Array.from({ length: 5 }).map((_, c) => (
                  <th key={c} className="px-4 py-2.5">
                    <SkeletonBase shimmer className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {Array.from({ length: 5 }).map((_, r) => (
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
      ))}
    </div>
  );
}
