import { RegistryPageSkeleton } from "@/components/loading/skeletons";

/**
 * Route-level loading state for the employee registry — mirrors the real page
 * (stat cards + filter panel + table) instead of falling back to the generic
 * dashboard skeleton.
 */
export default function EmployeesLoading() {
  return <RegistryPageSkeleton />;
}
