import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Link href={`/children/${id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to profile
      </Link>
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Edit Child Record</h1>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-6 text-sm text-brand-600">
        Edit form for record {id}. Update fields and submit changes.
      </div>
    </div>
  );
}
