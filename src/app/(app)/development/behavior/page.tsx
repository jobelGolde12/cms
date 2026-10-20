import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listBehaviorRecords } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Behavior Records" };

/**
 * Full behavior records list. Linked from the dashboard "Open Behavior
 * Concerns" panel. Recording/editing happens on the student profile page.
 */
export default async function DevelopmentBehaviorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "behavior.view")) redirect("/dashboard");

  const rows = await listBehaviorRecords(user, undefined, 1, 100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student Development"
        title="Behavior Records"
        description="All behavior records in your scope, most recent first."
        actions={
          <Link
            href="/development"
            className="inline-flex h-9 items-center rounded-md border border-brand-200 bg-white px-3 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100"
          >
            ← Development overview
          </Link>
        }
      />

      <Card>
        <CardHeader
          title="Records"
          description={`${rows.length} record${rows.length === 1 ? "" : "s"} (latest 100).`}
          icon={<Users aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={860}>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Category</Th>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Severity</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                icon={<Users className="h-10 w-10" />}
                title="No behavior records"
                description="Behavior records appear here once recorded on student profiles."
              />
            ) : (
              rows.map((b) => (
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
                  <Td className="max-w-[280px] truncate text-xs text-brand-600">
                    <span title={b.description}>{b.description}</span>
                  </Td>
                  <Td className="text-xs capitalize text-brand-600">{b.severity ?? "—"}</Td>
                  <Td>
                    <Badge
                      tone={
                        b.status === "resolved" ? "verified" : b.status === "monitored" ? "pending" : "info"
                      }
                    >
                      {b.status}
                    </Badge>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}
