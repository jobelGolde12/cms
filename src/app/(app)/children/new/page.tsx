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
      <Link href="/children" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to registry
      </Link>
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Add Child Record</h1>
      <ChildForm barangays={barangays} schools={schools} mode="create" />
    </div>
  );
}
