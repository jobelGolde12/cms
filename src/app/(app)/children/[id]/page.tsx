import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Clock, EyeOff, QrCode, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessChild } from "@/lib/scope";
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
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import {
  EDUCATION_STATUS_LABELS,
  type EducationStatus,
  ECCD_STATUS_LABELS,
  type EccdStatus,
} from "@/lib/constants";
import { ValidationReviewForm } from "@/components/validation/review-form";
import { ArchiveChildButton } from "@/components/archive-child-button";

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} icon={icon} />
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </Card>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-brand-500">{children}</p>;
}

export default async function ChildProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const child = await getChildProfile(id);
  if (!child) redirect("/children");

  // Row-level read guard: the registry's View action links here, so this page
  // must enforce the same scope the list already applies.
  if (!canAccessChild(user, child)) redirect("/children");

  const canReview = hasPermission(user.role, "validation.review");
  const canArchive =
    hasPermission(user.role, "children.delete") && child.status === "active";
  const isPending = child.recordStatus === "pending_validation";

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
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-brand-500">
        <Link href="/children" className="font-medium transition-colors hover:text-brand-900">
          Registry
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <span className="numeric font-medium text-brand-900">{child.childCode}</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
              {fullName(child)}
            </h1>
            <RecordStatusBadge status={child.recordStatus as never} />
          </div>
          <p className="numeric mt-1 flex items-center gap-2 text-sm text-brand-500">
            <span>
              {child.childCode} · {ageFromBirthDate(child.birthDate)} yrs · {child.barangayName}
            </span>
            <CopyButton value={child.childCode} />
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canArchive ? (
            <ArchiveChildButton childId={child.id} childCode={child.childCode} />
          ) : null}
          <Link href={`/children/${child.id}/edit`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* ------------------------------ Main column ------------------------------ */}
        <div className="space-y-5 lg:col-span-2">
          <Section title="Basic Information">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-400">Birth Date</dt>
                <dd className="mt-0.5 font-medium text-brand-900">{formatDate(child.birthDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-400">Sex</dt>
                <dd className="mt-0.5 font-medium capitalize text-brand-900">{child.sex}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-400">Civil Status</dt>
                <dd className="mt-0.5 font-medium capitalize text-brand-900">{child.civilStatus ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-400">Birth Place</dt>
                <dd className="mt-0.5 font-medium text-brand-900">{child.birthPlace ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-400">Barangay</dt>
                <dd className="mt-0.5 font-medium text-brand-900">{child.barangayName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-400">Household Address</dt>
                <dd className="mt-0.5 font-medium text-brand-900">
                  {currentAddress
                    ? `${currentAddress.householdAddress}${currentAddress.sitio ? `, ${currentAddress.sitio}` : ""}`
                    : "—"}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="Education">
            {education.length === 0 ? (
              <EmptyHint>No education records.</EmptyHint>
            ) : (
              <ul className="divide-y divide-brand-100">
                {education.map((e) => (
                  <li key={e.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-brand-900">
                        {EDUCATION_STATUS_LABELS[e.educationStatus as EducationStatus] ?? e.educationStatus}
                        {e.isCurrent ? (
                          <span className="ml-2 rounded-full bg-action-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-action-800">
                            Current
                          </span>
                        ) : null}
                      </span>
                      <span className="numeric shrink-0 text-xs text-brand-500">{e.schoolYear ?? "—"}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-brand-500">
                      {e.schoolName ?? "No school"}
                      {e.gradeLevel ? ` · ${e.gradeLevel}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="ECCD">
            {eccd.length === 0 ? (
              <EmptyHint>No ECCD records.</EmptyHint>
            ) : (
              <ul className="divide-y divide-brand-100">
                {eccd.map((e) => (
                  <li key={e.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="font-medium text-brand-900">
                      {ECCD_STATUS_LABELS[e.participationStatus as EccdStatus] ?? e.participationStatus}
                    </span>
                    {e.programName ? <span className="text-brand-500"> · {e.programName}</span> : null}
                    {e.remarks ? <span className="mt-0.5 block text-xs text-brand-500">{e.remarks}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Disability (restricted)"
            icon={<EyeOff aria-hidden="true" className="h-4 w-4" />}
          >
            {disabilities.length === 0 ? (
              <EmptyHint>No disability records.</EmptyHint>
            ) : (
              <ul className="divide-y divide-brand-100">
                {disabilities.map((d) => (
                  <li key={d.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="font-medium text-brand-900">
                      {d.hasDisability ? (d.disabilityType ?? "Type unspecified") : "None recorded"}
                    </span>
                    {d.supportNeeded ? (
                      <span className="mt-0.5 block text-xs text-brand-500">Support: {d.supportNeeded}</span>
                    ) : null}
                    <span className="mt-0.5 block text-xs text-brand-400">
                      {d.verified ? "Verified" : "Unverified"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* ----------------------------- Side column ------------------------------ */}
        <div className="space-y-5">
          {canReview && isPending ? (
            <Card>
              <CardHeader
                title="Review Decision"
                icon={<ShieldCheck aria-hidden="true" className="h-4 w-4 text-action-700" />}
              />
              <div className="px-4 py-4">
                <p className="mb-3 text-xs leading-relaxed text-brand-500">
                  This record is awaiting validation. Your decision is recorded in
                  the validation history and the encoder is notified.
                </p>
                <ValidationReviewForm childId={child.id} />
              </div>
            </Card>
          ) : null}

          <Section title="Validation History" icon={<Clock aria-hidden="true" className="h-4 w-4" />}>
            {validations.length === 0 ? (
              <p className="text-xs text-brand-500">No validation records yet.</p>
            ) : (
              <ul className="divide-y divide-brand-100">
                {validations.map((h) => (
                  <li key={h.id} className="py-2.5 text-xs first:pt-0 last:pb-0">
                    <div className="font-medium capitalize text-brand-800">
                      {h.status.replace(/_/g, " ")}
                    </div>
                    <div className="text-brand-500">
                      {h.submitterFirst ? `${h.submitterFirst} ${h.submitterLast}` : "—"}
                      {h.reviewerFirst ? ` → reviewed by ${h.reviewerFirst} ${h.reviewerLast}` : ""}
                    </div>
                    <div className="text-brand-400">{formatDateTime(h.submittedAt)}</div>
                    {h.remarks ? <div className="mt-0.5 text-brand-500">{h.remarks}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="QR Events" icon={<QrCode aria-hidden="true" className="h-4 w-4" />}>
            {qrEvents.length === 0 ? (
              <p className="text-xs text-brand-500">No QR events.</p>
            ) : (
              <ul className="divide-y divide-brand-100">
                {qrEvents.map((t) => (
                  <li key={t.id} className="py-2.5 text-xs first:pt-0 last:pb-0">
                    <span className="numeric text-brand-800">{t.verificationToken.slice(0, 12)}…</span>
                    <span className="ml-2 capitalize text-brand-400">
                      {t.verificationType} · {t.result}
                    </span>
                    <span className="block text-brand-400">{formatDateTime(t.verifiedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Record Meta" icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}>
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-brand-500">Created by</dt>
                <dd className="text-brand-800">{child.createdByName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-brand-500">Updated by</dt>
                <dd className="text-brand-800">{child.updatedByName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-brand-500">Created</dt>
                <dd className="text-brand-800">{formatDateTime(child.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-brand-500">Updated</dt>
                <dd className="text-brand-800">{formatDateTime(child.updatedAt)}</dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}
