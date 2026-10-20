import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, BookOpenCheck, HeartHandshake, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  listAssessments,
  listBehaviorRecords,
  listInterventions,
} from "@/lib/queries";
import { INTERVENTION_STATUS_LABELS, type InterventionStatus } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Student Development" };

const INTERVENTION_TONE: Record<string, "verified" | "pending" | "info" | "neutral" | "error"> = {
  planned: "info",
  active: "pending",
  completed: "verified",
  discontinued: "neutral",
};

/**
 * Student development overview: learning assessments (reading / literacy /
 * numeracy), behavior records, and interventions. Read-only listing views —
 * case management happens on the student profile page.
 */
export default async function DevelopmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canAssess = hasPermission(user.role, "assessments.view");
  const canBehavior = hasPermission(user.role, "behavior.view");
  const canInterventions = hasPermission(user.role, "interventions.view");

  if (!canAssess && !canBehavior && !canInterventions) redirect("/dashboard");

  const [assessments, behavior, interventions] = await Promise.all([
    canAssess ? listAssessments(user, undefined, 1, 20) : null,
    canBehavior ? listBehaviorRecords(user, undefined, 1, 20) : null,
    canInterventions ? listInterventions(user, undefined, 1, 20) : null,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student Development"
        title="Student Development"
        description="Learning assessments, behavior records, and intervention cases across your scope. Record new entries from a student's profile page."
      />

      {/* --------------------------- Assessments --------------------------- */}
      {canAssess && assessments ? (
        <Card>
          <CardHeader
            title="Assessments"
            description="Reading, literacy, and numeracy assessment results (latest first)."
            icon={<BookOpenCheck aria-hidden="true" className="h-4 w-4" />}
          />
          <div className="overflow-x-auto px-4 pb-3 pt-1">
            <table className="w-full text-sm">
              <thead>
              <tr>
                <Th>Student</Th>
                <Th>Domain</Th>
                <Th>Date</Th>
                <Th>Level</Th>
                <Th align="right">Score</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {assessments.length === 0 ? (
                <TableEmptyState
                  colSpan={5}
                  icon={<BookOpenCheck className="h-10 w-10" />}
                  title="No assessments recorded"
                  description="Assessment results appear here once recorded on student profiles."
                />
              ) : (
                assessments.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-brand-50/70">
                    <Td>
                      <Link
                        href={`/students/${a.studentId}`}
                        className="font-medium text-brand-900 hover:text-action-700"
                      >
                        <span className="numeric text-xs font-semibold text-[#64748B]">
                          {a.studentNumber}
                        </span>
                        <span className="ml-2">
                          {a.lastName}, {a.firstName}
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-xs capitalize text-brand-700">{a.domain}</Td>
                    <Td className="text-xs text-brand-600">{formatDate(a.date)}</Td>
                    <Td className="text-xs text-brand-600">{a.level ?? "—"}</Td>
                    <Td className="numeric text-right text-brand-900">{a.score ?? "—"}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </Card>
      ) : null}

      {/* ---------------------------- Behavior ----------------------------- */}
      {canBehavior && behavior ? (
        <Card>
          <CardHeader
            title="Behavior Records"
            description="Positive recognition and classroom concerns recorded by personnel."
            icon={<Users aria-hidden="true" className="h-4 w-4" />}
            actions={
              <Link
                href="/development/behavior"
                className="text-xs font-medium text-action-700 hover:text-action-800"
              >
                View all →
              </Link>
            }
          />
          <TableWrap minWidth={760}>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Category</Th>
                <Th>Date</Th>
                <Th>Severity</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {behavior.length === 0 ? (
                <TableEmptyState
                  colSpan={5}
                  icon={<Users className="h-10 w-10" />}
                  title="No behavior records"
                  description="Behavior records appear here once recorded on student profiles."
                />
              ) : (
                behavior.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-brand-50/70">
                    <Td>
                      <Link
                        href={`/students/${b.studentId}`}
                        className="font-medium text-brand-900 hover:text-action-700"
                      >
                        <span className="numeric text-xs font-semibold text-[#64748B]">
                          {b.studentNumber}
                        </span>
                        <span className="ml-2">
                          {b.lastName}, {b.firstName}
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-xs text-brand-700">{b.categoryName}</Td>
                    <Td className="text-xs text-brand-600">{formatDate(b.date)}</Td>
                    <Td className="text-xs capitalize text-brand-600">{b.severity ?? "—"}</Td>
                    <Td>
                      <Badge tone={b.status === "resolved" ? "verified" : b.status === "monitored" ? "pending" : "info"}>
                        {b.status}
                      </Badge>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableWrap>
        </Card>
      ) : null}

      {/* -------------------------- Interventions -------------------------- */}
      {canInterventions && interventions ? (
        <Card>
          <CardHeader
            title="Interventions"
            description="Active and historical intervention cases with follow-up counts."
            icon={<HeartHandshake aria-hidden="true" className="h-4 w-4" />}
          />
          <div className="overflow-x-auto px-4 pb-4 pt-0">
            <TableWrap minWidth={760}>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Start</Th>
                  <Th align="right">Follow-ups</Th>
                </tr>
              </thead>
            <tbody className="divide-y divide-brand-100">
              {interventions.length === 0 ? (
                <TableEmptyState
                  colSpan={5}
                  icon={<HeartHandshake className="h-10 w-10" />}
                  title="No interventions yet"
                  description="Intervention cases appear here once planned for students."
                />
              ) : (
                interventions.map((i) => (
                  <tr key={i.id} className="transition-colors hover:bg-brand-50/70">
                    <Td>
                      <Link
                        href={`/students/${i.studentId}`}
                        className="font-medium text-brand-900 hover:text-action-700"
                      >
                        <span className="numeric text-xs font-semibold text-[#64748B]">
                          {i.studentNumber}
                        </span>
                        <span className="ml-2">
                          {i.lastName}, {i.firstName}
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-xs text-brand-700">{i.interventionType}</Td>
                    <Td>
                      <Badge tone={INTERVENTION_TONE[i.status] ?? "neutral"}>
                        {INTERVENTION_STATUS_LABELS[i.status as InterventionStatus] ?? i.status}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-brand-600">{i.startDate ? formatDate(i.startDate) : "—"}</Td>
                    <Td className="numeric text-right text-brand-700">{i.followupCount}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableWrap>
          </div>
        </Card>
      ) : null}

      {assessments === null && behavior === null && interventions === null ? (
        <EmptyState
          icon={<Activity className="h-10 w-10" />}
          title="No development modules available"
          description="Your role does not include assessment, behavior, or intervention access."
        />
      ) : null}
    </div>
  );
}
