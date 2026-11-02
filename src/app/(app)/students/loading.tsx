import { RegistryPageSkeleton } from "@/components/loading/skeletons";

/**
 * Route-level loading state for the student registry.
 * Mirrors the real page layout (KPI grid + filter panel + table rows) so
 * navigating into /students no longer flashes a bare screen.
 */
export default function StudentsLoading() {
  return <RegistryPageSkeleton />;
}
