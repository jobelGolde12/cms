import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listBarangays, listSchools } from "@/lib/queries";
import { ChildForm } from "@/components/child-form";

export default async function NewChildPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [barangays, schools] = await Promise.all([listBarangays(), listSchools()]);

  return (
    <div className="space-y-6">
      <Link href="/children" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-900">
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> Back to registry
      </Link>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
          Child Mapping Registry
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
          Add Child Record
        </h1>
        <p className="mt-1 text-sm text-brand-500">
          Save as a draft or submit the record for LGU validation.
        </p>
      </div>
      <ChildForm barangays={barangays} schools={schools} mode="create" />
    </div>
  );
}
