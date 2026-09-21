import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function NewChildPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="space-y-6">
      <Link href="/children" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to registry
      </Link>
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Add Child Record</h1>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-6 text-sm text-brand-600 space-y-4">
        <p>Multi-section form: Basic Information → Address → Education → ECCD → Disability → Review → Submit.</p>
        <p>Client-side validation via Zod + React Hook Form; server-side validation enforced.</p>
      </div>
    </div>
  );
}
