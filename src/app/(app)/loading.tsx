import { DashboardPageSkeleton } from "@/components/loading/skeletons";

/**
 * Route-level loading state for the authenticated app group.
 * This covers all dashboard routes when navigating between them.
 * Each major route also has its own `loading.tsx` for more specific skeletons.
 */
export default function AppLoading() {
  return <DashboardPageSkeleton />;
}
