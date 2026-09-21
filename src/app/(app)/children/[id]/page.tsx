import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, QrCode, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getChildRow, getChildHistory, getChildQrTokens } from "@/lib/queries";
import { formatDate, fullName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ChildProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const child = await getChildRow(id);
  if (!child) redirect("/children");

  const [history, tokens] = await Promise.all([
    getChildHistory(id),
    getChildQrTokens(id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-xs text-brand-500">
        <Link href="/children" className="hover:text-brand-900">Registry</Link>
        <span>/</span>
        <span className="font-medium text-brand-900">Profile</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">
              {fullName(child)}
            </h1>
            <Badge tone={child.validationStatus === "verified" ? "verified" : "pending"}>
              {child.validationStatus.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-sm text-brand-500 font-mono">{child.childCode}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/children/${child.id}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-brand-200 bg-white shadow-sm p-6 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-brand-900 mb-3">Basic Information</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-brand-500">Birth Date</dt><dd className="text-brand-900 font-medium">{formatDate(child.birthDate)}</dd>
              <dt className="text-brand-500">Sex</dt><dd className="text-brand-900 font-medium capitalize">{child.sex}</dd>
              <dt className="text-brand-500">Barangay</dt><dd className="text-brand-900 font-medium">{child.barangayName}</dd>
              <dt className="text-brand-500">Address</dt><dd className="text-brand-900 font-medium">{child.addressDetails || "—"}</dd>
            </dl>
          </section>
          <section>
            <h3 className="text-sm font-bold text-brand-900 mb-3">Education</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-brand-500">Status</dt><dd className="text-brand-900 font-medium capitalize">{child.educationalStatus.replace(/_/g, " ")}</dd>
              <dt className="text-brand-500">School</dt><dd className="text-brand-900 font-medium">{child.schoolName || "—"}</dd>
              <dt className="text-brand-500">Grade</dt><dd className="text-brand-900 font-medium">{child.gradeLevel || "—"}</dd>
              <dt className="text-brand-500">Year</dt><dd className="text-brand-900 font-medium">{child.schoolYear || "—"}</dd>
            </dl>
          </section>
          <section>
            <h3 className="text-sm font-bold text-brand-900 mb-3">ECCD & Disability</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-brand-500">ECCD</dt><dd className="text-brand-900 font-medium capitalize">{child.eccdStatus.replace(/_/g, " ")}</dd>
              <dt className="text-brand-500">Disability</dt><dd className="text-brand-900 font-medium capitalize">{child.disabilityStatus.replace(/_/g, " ")}</dd>
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-bold text-brand-900 mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-brand-500" /> Validation History</h3>
            {history.length === 0 ? <p className="text-xs text-brand-500">No history yet.</p> : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="text-xs text-brand-700 border-b border-brand-100 pb-2 last:border-0 last:pb-0">
                    <div className="font-medium capitalize">{h.action.replace(/_/g, " ")}</div>
                    <div className="text-brand-500">{h.performer ? `${h.performer} ${h.performerLast}` : "—"}</div>
                    <div className="text-brand-400">{formatDate(h.createdAt as unknown as string)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
            <h3 className="text-sm font-bold text-brand-900 mb-3 flex items-center gap-2"><QrCode className="h-4 w-4 text-brand-500" /> QR Tokens</h3>
            {tokens.length === 0 ? <p className="text-xs text-brand-500">No active tokens.</p> : (
              <ul className="space-y-2">
                {tokens.map((t) => (
                  <li key={t.token} className="text-xs text-brand-700">
                    <span className="font-mono">{t.token.slice(0, 16)}...</span>
                    <span className="ml-2 text-brand-400">{t.isActive ? "Active" : "Inactive"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
