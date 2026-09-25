import { redirect } from "next/navigation";
import Link from "next/link";
import { QrCode, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/db";
import { children, qrVerifications } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { formatDateTime } from "@/lib/utils";

export default async function QrPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "qr.verify")) redirect("/dashboard");

  // Recent generate events with child codes (codes only — tokens are opaque).
  const recent = await db
    .select({
      id: qrVerifications.id,
      childId: qrVerifications.childId,
      childCode: children.childCode,
      type: qrVerifications.verificationType,
      result: qrVerifications.result,
      verifiedAt: qrVerifications.verifiedAt,
    })
    .from(qrVerifications)
    .innerJoin(children, eq(children.id, qrVerifications.childId))
    .where(and(eq(qrVerifications.verificationType, "generate")))
    .orderBy(desc(qrVerifications.verifiedAt))
    .limit(10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">QR Studio</h1>

      <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="h-5 w-5 text-action-700" />
          <h2 className="text-base font-bold text-brand-900">Secure QR tokens</h2>
        </div>
        <ul className="text-sm text-brand-600 space-y-2 list-disc pl-5">
          <li>QR codes are generated per verified child from their profile page.</li>
          <li>
            The QR payload contains <strong>only an opaque random token</strong> — never a name,
            birth date, address, disability data, or contact information.
          </li>
          <li>
            The public page <Link href="/verify" className="text-action-700 underline underline-offset-2">/verify</Link>{" "}
            resolves the token server-side and shows minimal permitted information.
          </li>
          <li>Generating a new token supersedes older ones; tokens can be revoked at any time.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-brand-100 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-bold text-brand-900">Recent QR activity</h2>
        </div>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Child code</th>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-left">Result</th>
              <th className="px-4 py-3 text-left">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {recent.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-brand-500">No QR events yet.</td></tr>
            ) : (
              recent.map((r) => (
                <tr key={r.id} className="hover:bg-brand-50">
                  <td className="px-4 py-3">
                    <Link href={`/children/${r.childId}`} className="font-mono text-xs text-brand-700 hover:text-action-700">
                      {r.childCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-brand-600">{r.type}</td>
                  <td className="px-4 py-3 text-xs text-brand-600">{r.result}</td>
                  <td className="px-4 py-3 text-xs text-brand-500">{formatDateTime(r.verifiedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
