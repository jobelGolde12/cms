import { Suspense } from "react";
import { SkeletonBase } from "./skeletons";

/**
 * Independent section loading boundary — keeps the rest of the page visible
 * while a single section loads. Use for charts, tables, or cards that load
 * independently from the page-level skeleton.
 */
export function SectionLoadingBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        fallback ?? (
          <div className="rounded-lg border border-brand-200 bg-white shadow-xs p-4 space-y-3">
            <SkeletonBase shimmer className="h-4 w-36" />
            <SkeletonBase shimmer className="h-2 w-full max-w-xs" />
            <SkeletonBase shimmer className="h-16 w-full" />
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}
