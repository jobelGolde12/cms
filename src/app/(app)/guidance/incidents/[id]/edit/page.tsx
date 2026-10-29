import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getCurrentEnrollment, getGuidanceIncident, listBehaviorCategories } from "@/lib/queries";
import { canViewConfidentialBehavior } from "@/lib/scope";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { IncidentForm } from "@/components/guidance/incident-form";

export const metadata = { title: "Edit Incident · Records Management System" };

/** Update an incident record (allowed for the same roles that record them). */
export default async function EditIncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "behavior.write") || !canViewConfidentialBehavior(user)) {
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
    </div>
  );
}
