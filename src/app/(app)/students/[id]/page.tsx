import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Clock, QrCode, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessStudent } from "@/lib/scope";
import {
  getStudentProfile,
  getGuardiansForStudent,
  getEnrollmentHistory,
  getStudentGrades,
  getAttendanceForStudent,
  getAssessmentsForStudent,
  getBehaviorForStudent,
  getClinicalForStudent,
  getHealthForStudent,
  getInterventionsForStudent,
  getVerificationHistory,
  getQrEvents,
} from "@/lib/queries";
import { formatDate, formatDateTime, fullName, ageFromBirthDate } from "@/lib/utils";
import { RecordStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import {
  ENROLLMENT_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  ASSESSMENT_DOMAIN_LABELS,
  INTERVENTION_STATUS_LABELS,
  type EnrollmentStatus,
  type AttendanceStatus,
  type AssessmentDomain,
  type InterventionStatus,
} from "@/lib/constants";
import { ValidationReviewForm } from "@/components/validation/review-form";
import { ArchiveStudentButton } from "@/components/archive-student-button";
import { HealthRecordForm } from "@/components/health/health-record-form";
import { ClinicalRecordForm } from "@/components/health/clinical-record-form";
import { NUTRITIONAL_STATUS_LABELS, type NutritionalStatus } from "@/lib/constants";
import { Printer } from "lucide-react";

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
  return <p className="text-sm text-[#64748B]">{children}</p>;
}

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const student = await getStudentProfile(id);
  if (!student) redirect("/students");

  // Row-level read guard: the registry's View action links here, so this page
  // must enforce the same scope the list already applies.
  if (!(await canAccessStudent(user, { studentId: id }))) redirect("/students");

  // Domain gates — every section of this profile visible to a role is
  // explicitly allowed; sensitive data is never rendered "by default".
  const canReview = hasPermission(user.role, "verification.review");
  const canArchive =
    hasPermission(user.role, "students.archive") && student.status === "active";
  const canEditBasic = hasPermission(user.role, "students.update");
  const canGrades = hasPermission(user.role, "grades.view");
  const canAssessments = hasPermission(user.role, "assessments.view");
  const canBehavior = hasPermission(user.role, "behavior.view");
  const canInterventions = hasPermission(user.role, "interventions.view");
  const canAttendance = hasPermission(user.role, "attendance.view");
  const canQr = hasPermission(user.role, "qr.verify");
  const canHealth = hasPermission(user.role, "health.view");
  const canWriteHealth = hasPermission(user.role, "health.write");
  const canPrint = hasPermission(user.role, "documents.print");
  const isPending = student.recordStatus === "pending_validation";

  const [guardians, enrollments, grades, attendance, assessments, behavior, interventions, verifications, qrEvents, health, clinical] =
    await Promise.all([
      getGuardiansForStudent(id),
      getEnrollmentHistory(id),
      getStudentGrades(id),
      getAttendanceForStudent(id),
      getAssessmentsForStudent(id),
      // Confidential behavior rows are filtered per role inside the query.
      getBehaviorForStudent(id, user),
      getInterventionsForStudent(id),
      getVerificationHistory(id),
      getQrEvents(id),
      getHealthForStudent(id),
      getClinicalForStudent(id),
    ]);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#64748B]">
        <Link href="/students" className="font-medium transition-colors hover:text-brand-900">
          Registry
        </Link>
        <ChevronRight aria-hidden="true" className="h-3 w-3 text-brand-300" />
        <span className="numeric font-medium text-brand-900">{student.studentNumber}</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
              {fullName(student)}
            </h1>
            <RecordStatusBadge status={student.recordStatus as never} />
          </div>
          <p className="numeric mt-1 flex items-center gap-2 text-sm text-[#64748B]">
            <span>
              {student.studentNumber} · {ageFromBirthDate(student.birthDate) ?? "—"} yrs ·{" "}
              {student.sex === "male" ? "Male" : "Female"}
            </span>
            <CopyButton value={student.studentNumber} />
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canPrint ? (
            <>
              <Link href={`/students/${student.id}/print/card`}>
                <Button variant="outline" size="sm">
                  <Printer aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                  Card
                </Button>
              </Link>
              <Link href={`/students/${student.id}/print/form137`}>
                <Button variant="outline" size="sm">
                  <Printer aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                  Form 137
                </Button>
              </Link>
            </>
          ) : null}
          {canArchive ? (
            <ArchiveStudentButton studentId={student.id} studentNumber={student.studentNumber} />
          ) : null}
          {canEditBasic ? (
            <Link href={`/students/${student.id}/edit`}>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        {/* ------------------------------ Main column ------------------------------ */}
        <div className="space-y-5 lg:col-span-2">
          <Section title="Basic Information">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-400">Birth Date</dt>
                <dd className="mt-0.5 font-medium text-brand-900">{formatDate(student.birthDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-400">Sex</dt>
                <dd className="mt-0.5 font-medium capitalize text-brand-900">{student.sex}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-400">Contact Number</dt>
                <dd className="mt-0.5 font-medium text-brand-900">{student.contactNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-brand-400">Address</dt>
                <dd className="mt-0.5 font-medium text-brand-900">{student.address ?? "—"}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Guardians">
            {guardians.length === 0 ? (
              <EmptyHint>No guardian recorded.</EmptyHint>
            ) : (
              <ul className="divide-y divide-brand-100">
                {guardians.map((g) => (
                  <li key={g.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="font-medium text-brand-900">
                      {[g.firstName, g.middleName, g.lastName].filter(Boolean).join(" ")}
                    </span>
                    {g.isPrimary ? (
                      <span className="ml-2 rounded-full bg-action-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-action-800">
                        Primary
                      </span>
                    ) : null}
                    <span className="block text-xs capitalize text-[#64748B]">
                      {g.relationship}
                      {g.contactNumber ? ` · ${g.contactNumber}` : ""}
                      {g.email ? ` · ${g.email}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Enrollment History">
            {enrollments.length === 0 ? (
              <EmptyHint>No enrollment records.</EmptyHint>
            ) : (
              <ul className="divide-y divide-brand-100">
                {enrollments.map((e) => (
                  <li key={e.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-brand-900">
                        {e.gradeLevelName} — {e.sectionName}
                        {e.status === "active" ? (
                          <span className="ml-2 rounded-full bg-action-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-action-800">
                            {ENROLLMENT_STATUS_LABELS[e.status as EnrollmentStatus] ?? e.status}
                          </span>
                        ) : (
                          <span className="ml-2 text-xs text-[#64748B]">
                            {ENROLLMENT_STATUS_LABELS[e.status as EnrollmentStatus] ?? e.status}
                          </span>
                        )}
                      </span>
                      <span className="numeric shrink-0 text-xs text-[#64748B]">{e.schoolYear}</span>
                    </div>
                    {e.enrollmentDate ? (
                      <div className="mt-0.5 text-xs text-[#64748B]">
                        Enrolled {formatDate(e.enrollmentDate)}
                      </div>
                    ) : null}
                    {e.remarks ? (
                      <div className="mt-0.5 text-xs text-[#64748B]">{e.remarks}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {canGrades ? (
          <Section title="Grades">
            {grades.length === 0 ? (
              <EmptyHint>No grades recorded.</EmptyHint>
            ) : (
              <ul className="divide-y divide-brand-100">
                {grades.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="font-medium text-brand-900">
                      {g.subjectName}
                      <span className="ml-2 text-xs font-normal text-[#64748B]">
                        {g.periodName} · {g.schoolYear}
                      </span>
                    </span>
                    <span className="numeric font-semibold text-brand-900">{g.grade}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          ) : null}

          {canAssessments ? (
          <Section title="Assessments">
            {assessments.length === 0 ? (
              <EmptyHint>No assessment records.</EmptyHint>
            ) : (
              <ul className="divide-y divide-brand-100">
                {assessments.map((a) => (
                  <li key={a.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-brand-900">
                        {ASSESSMENT_DOMAIN_LABELS[a.domain as AssessmentDomain] ?? a.domain}
                        {a.assessmentType ? <span className="text-[#64748B]"> · {a.assessmentType}</span> : null}
                      </span>
                      <span className="shrink-0 text-xs text-[#64748B]">
                        {a.level ?? "—"}
                        {a.score != null ? <span className="numeric"> · {a.score}</span> : null}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-brand-400">{formatDate(a.date)}</div>
                    {a.notes ? <div className="mt-0.5 text-xs text-[#64748B]">{a.notes}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>
          ) : null}

          {canBehavior ? (
          <Section title="Behavior Records">
            {behavior.length === 0 ? (
              <EmptyHint>No behavior records.</EmptyHint>
            ) : (
              <ul className="divide-y divide-brand-100">
                {behavior.map((b) => (
                  <li key={b.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-brand-900">
                        {b.categoryName}
                        <span className="ml-2 text-xs font-normal capitalize text-[#64748B]">
                          {b.categoryKind}
                          {b.severity ? ` · ${b.severity} severity` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs capitalize text-[#64748B]">{b.status}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-brand-600">{b.description}</div>
                    <div className="mt-0.5 text-xs text-brand-400">{formatDate(b.date)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          ) : null}

          {canHealth ? (
            <>
              <Section title="Health & Nutrition (Nurse)">
                {health.length === 0 ? (
                  <EmptyHint>No health measurements recorded.</EmptyHint>
                ) : (
                  <ul className="divide-y divide-brand-100">
                    {health.map((h) => (
                      <li key={h.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-brand-900">
                            {formatDate(h.measurementDate)}
                            {h.bmi != null ? <span className="numeric ml-2 text-xs text-[#64748B]">BMI {h.bmi}</span> : null}
                          </span>
                          <span className="text-xs capitalize text-[#64748B]">
                            {h.nutritionalStatus
                              ? NUTRITIONAL_STATUS_LABELS[h.nutritionalStatus as NutritionalStatus] ?? h.nutritionalStatus
                              : "—"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-[#64748B]">
                          {h.weightKg != null ? <span className="numeric">Weight {h.weightKg} kg</span> : null}
                          {h.heightCm != null ? <span className="numeric"> · Height {h.heightCm} cm</span> : null}
                          {h.recorderFirst ? <span> · {h.recorderFirst} {h.recorderLast}</span> : ""}
                        </div>
                        {h.remarks ? <div className="mt-0.5 text-xs text-brand-400">{h.remarks}</div> : null}
                      </li>
                    ))}
                  </ul>
                )}
                {canWriteHealth ? (
                  <details className="mt-3 rounded-md border border-brand-100 bg-brand-50/40 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-brand-600">
                      Record nutritional status
                    </summary>
                    <div className="pt-3">
                      <HealthRecordForm studentId={student.id} />
                    </div>
                  </details>
                ) : null}
              </Section>

              <Section title="Clinical Records (Nurse)">
                {clinical.length === 0 ? (
                  <EmptyHint>No clinical records.</EmptyHint>
                ) : (
                  <ul className="divide-y divide-brand-100">
                    {clinical.map((c) => (
                      <li key={c.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-brand-900">{c.category}</span>
                          <span className="numeric shrink-0 text-xs text-brand-400">{formatDate(c.date)}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-brand-600">{c.description}</div>
                        {c.actionTaken ? <div className="mt-0.5 text-xs text-[#64748B]">Action: {c.actionTaken}</div> : null}
                        {c.recorderFirst ? <div className="mt-0.5 text-xs text-brand-400">Recorded by {c.recorderFirst} {c.recorderLast}</div> : null}
                      </li>
                    ))}
                  </ul>
                )}
                {canWriteHealth ? (
                  <details className="mt-3 rounded-md border border-brand-100 bg-brand-50/40 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-brand-600">
                      Record clinical entry
                    </summary>
                    <div className="pt-3">
                      <ClinicalRecordForm studentId={student.id} />
                    </div>
                  </details>
                ) : null}
              </Section>
            </>
          ) : null}

          {canInterventions ? (
          <Section title="Interventions">
            {interventions.length === 0 ? (
              <EmptyHint>No interventions recorded.</EmptyHint>
            ) : (
              <ul className="divide-y divide-brand-100">
                {interventions.map((i) => (
                  <li key={i.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-brand-900">{i.interventionType}</span>
                      <span className="shrink-0 text-xs text-[#64748B]">
                        {INTERVENTION_STATUS_LABELS[i.status as InterventionStatus] ?? i.status}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-brand-600">{i.description}</div>
                    <div className="mt-0.5 text-xs text-brand-400">
                      {i.startDate ? formatDate(i.startDate) : "No start date"}
                      {i.targetDate ? ` → target ${formatDate(i.targetDate)}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          ) : null}

          {canAttendance ? (
          <Section
            title="Attendance (recent)"
            icon={<Clock aria-hidden="true" className="h-4 w-4" />}
          >
            {attendance.length === 0 ? (
              <EmptyHint>No attendance records.</EmptyHint>
            ) : (
              <ul className="divide-y divide-brand-100">
                {attendance.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                    <span className="numeric text-brand-700">{formatDate(a.date)}</span>
                    <span className="text-xs capitalize text-[#64748B]">
                      {ATTENDANCE_STATUS_LABELS[a.status as AttendanceStatus] ?? a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          ) : null}
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
                <p className="mb-3 text-xs leading-relaxed text-[#64748B]">
                  This record is awaiting verification. Your decision is recorded in
                  the verification history and the encoder is notified.
                </p>
                <ValidationReviewForm studentId={student.id} />
              </div>
            </Card>
          ) : null}

          <Section title="Verification History" icon={<Clock aria-hidden="true" className="h-4 w-4" />}>
            {verifications.length === 0 ? (
              <p className="text-xs text-[#64748B]">No verification records yet.</p>
            ) : (
              <ul className="divide-y divide-brand-100">
                {verifications.map((h) => (
                  <li key={h.id} className="py-2.5 text-xs first:pt-0 last:pb-0">
                    <div className="font-medium capitalize text-brand-800">
                      {h.status.replace(/_/g, " ")}
                    </div>
                    <div className="text-[#64748B]">
                      {h.submitterFirst ? `${h.submitterFirst} ${h.submitterLast}` : "—"}
                      {h.reviewerFirst ? ` → reviewed by ${h.reviewerFirst} ${h.reviewerLast}` : ""}
                    </div>
                    <div className="text-brand-400">{formatDateTime(h.submittedAt)}</div>
                    {h.remarks ? <div className="mt-0.5 text-[#64748B]">{h.remarks}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {canQr ? (
          <Section title="QR Events" icon={<QrCode aria-hidden="true" className="h-4 w-4" />}>
            {qrEvents.length === 0 ? (
              <p className="text-xs text-[#64748B]">No QR events.</p>
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
          ) : null}

          <Section title="Record Meta" icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}>
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-[#64748B]">Created by</dt>
                <dd className="text-brand-800">{student.createdByName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#64748B]">Updated by</dt>
                <dd className="text-brand-800">{student.updatedByName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#64748B]">Created</dt>
                <dd className="text-brand-800">{formatDateTime(student.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#64748B]">Updated</dt>
                <dd className="text-brand-800">{formatDateTime(student.updatedAt)}</dd>
              </div>
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}
