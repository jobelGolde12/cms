import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canEditStudent } from "@/lib/scope";
import { getStudentProfile, getGuardiansForStudent } from "@/lib/queries";
import { StudentForm } from "@/components/student-form";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const student = await getStudentProfile(id);
  if (!student) redirect("/students");
  if (!(await canEditStudent(user, { studentId: id }))) redirect(`/students/${id}`);

  const guardians = await getGuardiansForStudent(id);
  const primary = guardians.find((g) => g.isPrimary) ?? guardians[0];

  return (
    <div className="space-y-6">
      <Link href={`/students/${id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-900">
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> Back to profile
      </Link>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
          Student Records Registry
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
          Edit <span className="numeric">{student.studentNumber}</span>
        </h1>
        <p className="mt-1 text-sm text-brand-500">
          Changes create new history entries; previous records are preserved.
        </p>
      </div>
      <StudentForm
        mode="edit"
        defaults={{
          id: student.id,
          studentNumber: student.studentNumber,
          firstName: student.firstName,
          middleName: student.middleName,
          lastName: student.lastName,
          suffix: student.suffix,
          birthDate: student.birthDate,
          sex: student.sex,
          contactNumber: student.contactNumber,
          address: student.address,
          guardianFirstName: primary?.firstName ?? null,
          guardianMiddleName: primary?.middleName ?? null,
          guardianLastName: primary?.lastName ?? null,
          guardianRelationship: primary?.relationship ?? null,
          guardianContactNumber: primary?.contactNumber ?? null,
          guardianEmail: primary?.email ?? null,
        }}
      />
    </div>
  );
}
