import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getCurrentEnrollment,
  getStudentProfile,
  listBehaviorCategories,
  listStudents,
} from "@/lib/queries";
import { canViewConfidentialBehavior } from "@/lib/scope";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { IncidentForm } from "@/components/guidance/incident-form";

export const metadata = { title: "Record Incident · Records Management System" };

/**
 * Record an incident:
 *   Step 1 — search the registry and pick the student (name/section come from
 *            the student records, never typed by hand);
 *   Step 2 — fill in the incident, type, intervention (+ status/severity).
 */
export default async function NewIncidentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "behavior.write") || !canViewConfidentialBehavior(user)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const qRaw = sp.q;
  const q = typeof qRaw === "string" && qRaw.trim() !== "" ? qRaw.trim().slice(0, 100) : undefined;
  const studentParam = sp.student;
  const studentId = typeof studentParam === "string" && studentParam.trim() !== "" ? studentParam : undefined;

  // A selected student shows the form (student must still exist + be active).
  if (studentId) {
    const [profile, enrollment] = await Promise.all([
      getStudentProfile(studentId),
      getCurrentEnrollment(studentId),
    ]);
    if (!profile) redirect("/guidance/incidents/new");

    if (profile.status !== "active") {
      return (
        <div className="space-y-6">
          <PageHeader
            eyebrow="Guidance Office"
            title="Record incident"
            description="Incidents can only be recorded for active students."
          />
          <Card>
            <CardHeader
              title="Inactive record"
              description={`${profile.lastName}, ${profile.firstName} is not an active student, so no incident can be attached.`}
            />
          </Card>
        </div>
      );
    }

    const categories = (await listBehaviorCategories()).filter((c) => c.kind === "concern");

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Guidance Office"
          title="Record incident"
          description="Confidential by default — visible only to the Guidance Counselor and the administration."
        />
        <Card>
          <CardHeader title="Incident details" description="All fields are re-validated on the server." />
          <div className="px-4 pb-5 sm:px-6">
            <IncidentForm
              studentId={profile.id}
              studentName={[profile.lastName, profile.firstName].filter(Boolean).join(", ")}
              studentNumber={profile.studentNumber}
              sectionLabel={
                enrollment ? `${enrollment.gradeLevelName} — ${enrollment.sectionName}` : "No active enrollment"
              }
              categories={categories}
            />
          </div>
        </Card>
      </div>
    );
  }

  // Step 1: student search over the registry (scope-aware server query).
  const { rows, total } = await listStudents(user, { q, pageSize: 20 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Guidance Office"
        title="Record incident"
        description="Search the registry and select the student involved in the incident."
      />

      <Card>
        <CardHeader
          title="Select the student"
          description="Step 1 of 2 — student name and section are pulled from the registry to keep records consistent."
        />
        <form method="get" action="/guidance/incidents/new" className="flex items-end gap-2 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="incident-student-search"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"
            >
              Search students
            </label>
            <input
              id="incident-student-search"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Name or student number…"
              className="h-9 w-full rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-900 focus:border-action-500 focus:outline-none focus:ring-1 focus:ring-action-500"
            />
          </div>
          <button type="submit" className={buttonStyles("secondary", "sm")}>
            Search
          </button>
        </form>
        <TableWrap minWidth={640}>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Grade level</Th>
              <Th>Section</Th>
              <Th align="right">Action</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={4}
                icon={<Search className="h-10 w-10" />}
                title={q ? "No students match that search" : "No students in the registry yet"}
                description={
                  q
                    ? "Try a different name or student number."
                    : "Students appear here once imported into the registry."
                }
              />
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-brand-50/70">
                  <Td className="font-medium text-brand-900">
                    <span className="numeric text-xs font-semibold text-[#64748B]">
                      {s.studentNumber}
                    </span>
                    <span className="ml-2">
                      {s.lastName}, {s.firstName}
                    </span>
                  </Td>
                  <Td className="text-xs text-brand-600">{s.gradeLevelName ?? "—"}</Td>
                  <Td className="text-xs text-brand-600">{s.sectionName ?? "—"}</Td>
                  <Td align="right">
                    <Link
                      href={`/guidance/incidents/new?student=${s.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-action-700 hover:text-action-800"
                    >
                      <UserPlus aria-hidden="true" className="h-3.5 w-3.5" />
                      Select
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
        {rows.length > 0 ? (
          <p className="px-4 py-2 text-xs text-[#64748B]">
            Showing {rows.length} of {total} student{total === 1 ? "" : "s"}
            {q ? ` matching “${q}”` : ""}. Search the full registry from{" "}
            <Link href="/students" className="font-medium text-action-700 hover:text-action-800">
              Students
            </Link>
            .
          </p>
        ) : null}
      </Card>
    </div>
  );
}
