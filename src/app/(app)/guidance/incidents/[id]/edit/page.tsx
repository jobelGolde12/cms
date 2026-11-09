import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasUserPermission } from "@/lib/permissions";
import { getCurrentEnrollment, getGuidanceIncident, listBehaviorCategories } from "@/lib/queries";
import { canViewConfidentialBehavior } from "@/lib/scope";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { IncidentForm } from "@/components/guidance/incident-form";
import { AiAnalysisPanel } from "@/components/ai/ai-analysis-panel";
import { draftGuidanceFollowUp, summarizeGuidanceCase } from "@/actions/ai";

export const metadata = { title: "Edit Incident · Records Management System" };

/** Update an incident record (allowed for the same roles that record them). */
export default async function EditIncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasUserPermission(user.roles, "behavior.write") || !canViewConfidentialBehavior(user)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const incident = await getGuidanceIncident(user, id);
  if (!incident) notFound();

  const [categories, enrollment] = await Promise.all([
    listBehaviorCategories(),
    getCurrentEnrollment(incident.studentId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Guidance Office"
        title="Edit incident"
        description="Update the incident details, intervention, or case status. Changes are audit-logged."
      />
      <Card>
        <CardHeader
          title={incident.categoryName}
          description={`Recorded for ${incident.lastName}, ${incident.firstName}.`}
        />
        <div className="px-4 pb-5 sm:px-6">
          <IncidentForm
            studentId={incident.studentId}
            studentName={`${incident.lastName}, ${incident.firstName}`}
            studentNumber={incident.studentNumber}
            sectionLabel={
              enrollment ? `${enrollment.gradeLevelName} — ${enrollment.sectionName}` : incident.sectionName ?? "—"
            }
            categories={categories.filter((c) => c.kind === "concern")}
            initial={{
              id: incident.id,
              categoryId: incident.categoryId,
              date: incident.date,
              description: incident.incident,
              severity: incident.severity ?? "",
              followUp: incident.intervention ?? "",
              status: incident.status,
            }}
          />
        </div>
      </Card>

      {/* Guidance Office AI assistance — drafts only; the incident record is
          edited solely through the form above. Case summary and draft note
          are generated server-side from incidents the role may read. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AiAnalysisPanel
          feature="guidanceNote"
          action={draftGuidanceFollowUp}
          hidden={{ incidentId: incident.id }}
          triggerLabel="Draft follow-up note"
          pendingLabel="Drafting follow-up..."
        />
        <AiAnalysisPanel
          feature="guidanceCase"
          action={summarizeGuidanceCase}
          hidden={{ studentId: incident.studentId }}
          triggerLabel="Summarize case history"
          pendingLabel="Summarizing case..."
        />
      </div>
    </div>
  );
}
