import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, QrCode, Clock, EyeOff } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getChildProfile,
  getCurrentAddress,
  getEducationHistory,
  getEccdHistory,
  getDisabilityRecords,
  getValidationHistory,
  getQrEvents,
} from "@/lib/queries";
import { formatDate, formatDateTime, fullName, ageFromBirthDate } from "@/lib/utils";
import { RecordStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EDUCATION_STATUS_LABELS,
  type EducationStatus,
  ECCD_STATUS_LABELS,
  type EccdStatus,
} from "@/lib/constants";

export default async function ChildProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const child = await getChildProfile(id);
  if (!child) redirect("/children");

  const [addresses, education, eccd, disabilities, validations, qrEvents] = await Promise.all([
    getCurrentAddress(id),
    getEducationHistory(id),
    getEccdHistory(id),
    getDisabilityRecords(id),
    getValidationHistory(id),
    getQrEvents(id),
  ]);

  const currentAddress = addresses.find((a) => a.isCurrent) ?? addresses[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-xs text-brand-500">
        <Link href="/children" className="hover:text-brand-900">Registry</Link>
        <span>/</span>
        <span className="font-medium text-brand-900">{child.childCode}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">
              {fullName(child)}
            </h1>
            <RecordStatusBadge status={child.recordStatus as never} />
          </div>
          <p className="text-sm text-brand-500 font-mono">{child.childCode} · {ageFromBirthDate(child.birthDate)} yrs · {child.barangayName}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/children/${child.id}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-brand-200 bg-white shadow-sm p-6">
            <h3 className="text-sm font-bold text-brand-900 mb-3">Basic Information</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-brand-500">Birth Date</dt><dd className="text-brand-900 font-medium">{formatDate(child.birthDate)}</dd>
              <dt className="text-brand-500">Sex</dt><dd className="text-brand-900 font-medium capitalize">{child.sex}</dd>
              <dt className="text-brand-500">Civil Status</dt><dd className="text-brand-900 font-medium capitalize">{child.civilStatus ?? "—"}</dd>
              <dt className="text-brand-500">Birth Place</dt><dd className="text-brand-900 font-medium">{child.birthPlace ?? "—"}</dd>
              <dt className="text-brand-500">Barangay</dt><dd className="text-brand-900 font-medium">{child.barangayName}</dd>
              <dt className="text-brand-500">Household Address</dt>
              <dd className="text-brand-900 font-medium">
                {currentAddress ? `${currentAddress.householdAddress}${currentAddress.sitio ? `, ${currentAddress.sitio}` : ""}` : "—"}
              </dd>
            </dl>
          </section>

          <section className="rounded-xl border border-brand-200 bg-white shadow-sm p-6">
            <h3 className="text-sm font-bold text-brand-900 mb-3">Education</h3>
            {education.length === 0 ? (
              <p className="text-sm text-brand-500">No education records.</p>
            ) : (
              <ul className="space-y-3">
                {education.map((e) => (
                  <li key={e.id} className="text-sm border-b border-brand-100 pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-brand-900">
                        {EDUCATION_STATUS_LABELS[e.educationStatus as EducationStatus] ?? e.educationStatus}
                        {e.isCurrent ? <span className="ml-2 text-[10px] font-bold uppercase text-action-700">Current</span> : null}
                      </span>
                      <span className="text-xs text-brand-500">{e.schoolYear ?? "—"}</span>
                    </div>
                    <div className="text-xs text-brand-500">
                      {e.schoolName ?? "No school"}{e.gradeLevel ? ` · ${e.gradeLevel}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-brand-200 bg-white shadow-sm p-6">
            <h3 className="text-sm font-bold text-brand-900 mb-3">ECCD</h3>
            {eccd.length === 0 ? (
              <p className="text-sm text-brand-500">No ECCD records.</p>
            ) : (
              <ul className="space-y-2">
                {eccd.map((e) => (
                  <li key={e.id} className="text-sm text-brand-700">
                    <span className="font-medium">
                      {ECCD_STATUS_LABELS[e.participationStatus as EccdStatus] ?? e.participationStatus}
                    </span>
                    {e.programName ? <span className="text-brand-500"> · {e.programName}</span> : null}
                    {e.remarks ? <span className="block text-xs text-brand-500">{e.remarks}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-brand-200 bg-white shadow-sm p-6">
            <h3 className="text-sm font-bold text-brand-900 mb-3 flex items-center gap-2">
              <EyeOff aria-hidden="true" className="h-4 w-4 text-brand-500" /> Disability (restricted)
            </h3>
            {disabilities.length === 0 ? (
              <p className="text-sm text-brand-500">No disability records.</p>
            ) : (
              <ul className="space-y-2">
                {disabilities.map((d) => (
                  <li key={d.id} className="text-sm text-brand-700">
                    <span className="font-medium">{d.hasDisability ? (d.disabilityType ?? "Type unspecified") : "None recorded"}</span>
                    {d.supportNeeded ? <span className="block text-xs text-brand-500">Support: {d.supportNeeded}</span> : null}
                    <span className="block text-xs text-brand-400">{d.verified ? "Verified" : "Unverified"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-bold text-brand-900 mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-brand-500" /> Validation History</h3>
            {validations.length === 0 ? <p className="text-xs text-brand-500">No validation records yet.</p> : (
              <ul className="space-y-3">
                {validations.map((h) => (
                  <li key={h.id} className="text-xs text-brand-700 border-b border-brand-100 pb-2 last:border-0">
                    <div className="font-medium capitalize">{h.status.replace(/_/g, " ")}</div>
                    <div className="text-brand-500">
                      {h.submitterFirst ? `${h.submitterFirst} ${h.submitterLast}` : "—"}
                      {h.reviewerFirst ? ` → reviewed by ${h.reviewerFirst} ${h.reviewerLast}` : ""}
                    </div>
                    <div className="text-brand-400">{formatDateTime(h.submittedAt)}</div>
                    {h.remarks ? <div className="text-brand-500 mt-0.5">{h.remarks}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-bold text-brand-900 mb-3 flex items-center gap-2"><QrCode className="h-4 w-4 text-brand-500" /> QR Events</h3>
            {qrEvents.length === 0 ? <p className="text-xs text-brand-500">No QR events.</p> : (
              <ul className="space-y-2">
                {qrEvents.map((t) => (
                  <li key={t.id} className="text-xs text-brand-700">
                    <span className="font-mono">{t.verificationToken.slice(0, 12)}…</span>
                    <span className="ml-2 text-brand-400 capitalize">{t.verificationType} · {t.result}</span>
                    <span className="block text-brand-400">{formatDateTime(t.verifiedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-bold text-brand-900 mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-500" /> Record Meta</h3>
            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between gap-2"><dt className="text-brand-500">Created by</dt><dd className="text-brand-800">{child.createdByName ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-brand-500">Updated by</dt><dd className="text-brand-800">{child.updatedByName ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-brand-500">Created</dt><dd className="text-brand-800">{formatDateTime(child.createdAt)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-brand-500">Updated</dt><dd className="text-brand-800">{formatDateTime(child.updatedAt)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
