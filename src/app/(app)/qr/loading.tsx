import { SkeletonBase } from "@/components/loading/skeletons";

/** Route-level loading state for the QR Studio (header + info card + table). */
export default function QrLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading QR studio">
      <div className="space-y-2">
        <SkeletonBase shimmer className="h-2.5 w-36" />
        <SkeletonBase shimmer className="h-7 w-40" />
        <SkeletonBase shimmer className="h-3.5 w-80 max-w-full" />
      </div>
      <section className="rounded-lg border border-brand-200 bg-white p-4 shadow-xs space-y-3">
        <SkeletonBase shimmer className="h-4 w-40" />
        <SkeletonBase shimmer className="h-3 w-full max-w-md" />
        <SkeletonBase shimmer className="h-3 w-full max-w-lg" />
        <SkeletonBase shimmer className="h-3 w-full max-w-sm" />
      </section>
      <section className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <div className="border-b border-brand-100 px-4 py-3">
          <SkeletonBase shimmer className="h-4 w-44" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBase key={i} shimmer className="h-4 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
