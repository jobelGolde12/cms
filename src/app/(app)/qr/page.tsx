import { redirect } from "next/navigation";
import Link from "next/link";
import { QrCode, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/db";
import { students, qrVerifications } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { formatDateTime } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";

export default async function QrPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "qr.verify")) redirect("/dashboard");

  // Recent generate events with student numbers (numbers only — tokens are opaque).
  const recent = await db
    .select({
      id: qrVerifications.id,
      studentId: qrVerifications.studentId,
      studentNumber: students.studentNumber,
      type: qrVerifications.verificationType,
      result: qrVerifications.result,
      verifiedAt: qrVerifications.verifiedAt,
    })
    .from(qrVerifications)
    .innerJoin(students, eq(students.id, qrVerifications.studentId))
    .where(and(eq(qrVerifications.verificationType, "generate")))
    .orderBy(desc(qrVerifications.verifiedAt))
    .limit(10);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="QR Verification Tools"
        title="QR Studio"
        description="Generate secure QR identifiers from student profiles and review recent activity."
      />

      <Card>
        <CardHeader
          title="Secure QR tokens"
          icon={<QrCode aria-hidden="true" className="h-4 w-4 text-action-700" />}
        />
        <CardBody>
          <ul className="list-disc space-y-2 pl-5 text-sm text-brand-600">
            <li>QR codes are generated per verified student from their profile page.</li>
            <li>
              The QR payload contains <strong>only an opaque random token</strong> — never a name,
              birth date, address, disability data, or contact information.
            </li>
            <li>
              The public page{" "}
              <Link
                href="/verify"
                className="font-medium text-action-700 underline underline-offset-2 hover:text-action-800"
              >
                /verify
              </Link>{" "}
              resolves the token server-side and shows minimal permitted information.
            </li>
            <li>Generating a new token supersedes older ones; tokens can be revoked at any time.</li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Recent QR activity"
          description="Latest generation events across your scope."
          icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={560}>
          <thead>
            <tr>
              <Th>Student No.</Th>
              <Th>Event</Th>
              <Th>Result</Th>
              <Th>When</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {recent.length === 0 ? (
              <TableEmptyState
                colSpan={4}
                icon={<QrCode className="h-10 w-10" />}
                title="No QR events yet"
                description="Activity appears once QR codes are generated from verified student profiles."
              />
            ) : (
              recent.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-brand-50/70">
                  <Td>
                    <Link
                      href={`/students/${r.studentId}`}
                      className="numeric font-medium text-brand-700 hover:text-action-700"
                    >
                      {r.studentNumber}
                    </Link>
                  </Td>
                  <Td className="capitalize text-brand-600">{r.type}</Td>
                  <Td className="text-brand-600">{r.result}</Td>
                  <Td className="text-brand-500">{formatDateTime(r.verifiedAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}
