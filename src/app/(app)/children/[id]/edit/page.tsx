import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canEditChild } from "@/lib/scope";
import {
  getChildProfile,
  getCurrentAddress,
  getEducationHistory,
  getEccdHistory,
  getDisabilityRecords,
  listBarangays,
  listSchools,
} from "@/lib/queries";
import { ChildForm } from "@/components/child-form";

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const child = await getChildProfile(id);
  if (!child) redirect("/children");
  if (!canEditChild(user, child)) redirect(`/children/${id}`);

  const [barangays, schools, addresses, education, eccd, disabilities] = await Promise.all([
    listBarangays(),
    listSchools(),
    getCurrentAddress(id),
    getEducationHistory(id),
    getEccdHistory(id),
    getDisabilityRecords(id),
  ]);

  const currentAddress = addresses.find((a) => a.isCurrent) ?? addresses[0];
  const currentEducation = education.find((e) => e.isCurrent) ?? education[0];
  const currentEccd = eccd[0];
  const currentDisability = disabilities[0];

  return (
    <div className="space-y-6">
      <Link href={`/children/${id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-900">
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> Back to profile
      </Link>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
          Child Mapping Registry
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
          Edit <span className="numeric">{child.childCode}</span>
        </h1>
        <p className="mt-1 text-sm text-brand-500">
          Changes create new history entries; previous records are preserved.
        </p>
      </div>
      <ChildForm
        barangays={barangays}
        schools={schools}
        mode="edit"
        defaults={{
          id: child.id,
          childCode: child.childCode,
          firstName: child.firstName,
          middleName: child.middleName,
          lastName: child.lastName,
          suffix: child.suffix,
          birthDate: child.birthDate,
          sex: child.sex,
          civilStatus: child.civilStatus,
          birthPlace: child.birthPlace,
          barangayId: child.barangayId,
          householdAddress: currentAddress?.householdAddress ?? "",
          sitio: currentAddress?.sitio ?? null,
          educationStatus: currentEducation?.educationStatus ?? "not_yet_in_school",
          schoolId: currentEducation?.schoolId ?? null,
          gradeLevel: currentEducation?.gradeLevel ?? null,
          schoolYear: currentEducation?.schoolYear ?? null,
          eccdStatus: currentEccd?.participationStatus ?? "unknown",
          eccdProgramName: currentEccd?.programName ?? null,
          eccdProvider: currentEccd?.provider ?? null,
          hasDisability: currentDisability?.hasDisability ?? false,
          disabilityType: currentDisability?.disabilityType ?? null,
          disabilityDescription: currentDisability?.description ?? null,
          disabilitySupportNeeded: currentDisability?.supportNeeded ?? null,
          assistanceStatus: currentDisability?.assistanceStatus ?? null,
        }}
      />
    </div>
  );
}
