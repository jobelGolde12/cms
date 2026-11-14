import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasUserPermission } from "@/lib/permissions";
import { hasSchoolWideStudentScope } from "@/lib/scope";
import { listGradeLevels, listSchoolYears, listEnrollableSections } from "@/lib/queries";
import { StudentForm } from "@/components/student-form";

export default async function NewStudentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // The create form itself must be permission-gated, not just its action —
  // direct URL entries by non-encoder roles must not render it.
  if (!hasUserPermission(user.roles, "students.create")) redirect("/students");

  const canManageEnrollment = hasUserPermission(user.roles, "enrollment.manage");
  const [schoolYears, gradeLevels, sections] = canManageEnrollment
    ? await Promise.all([listSchoolYears(), listGradeLevels(), listEnrollableSections(user)])
    : [[], [], []];

  return (
    <div className="space-y-6">
      <Link href="/students" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-900">
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> Back to registry
      </Link>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
          Student Records Registry
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
          Add Student Record
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Save as a draft or submit the record for school verification. The
          student number is generated automatically.
        </p>
      </div>
      <StudentForm
        mode="create"
        enrollmentOptions={
          canManageEnrollment ? { schoolYears, gradeLevels, sections } : undefined
        }
        enrollmentRequired={canManageEnrollment && !hasSchoolWideStudentScope(user)}
      />
    </div>
  );
}
