import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listChildren, listBarangays } from "@/lib/queries";
import { RECORD_STATUSES, RECORD_STATUS_LABELS, type RecordStatus } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { RecordStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const barangay = typeof params.barangay === "string" ? params.barangay : "";
  const status = typeof params.status === "string" ? params.status : "";
  const sort = params.sort === "name" || params.sort === "oldest" ? params.sort : "recent";
  const page = parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1;

  const [result, barangays] = await Promise.all([
    listChildren(user, { q, barangay, status, sort, page }),
    listBarangays(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Child Registry</h1>
          <p className="mt-1 text-sm text-brand-500">Browse and manage child mapping records.</p>
        </div>
        <Link href="/children/new">
          <Button size="md">Add Child</Button>
        </Link>
      </div>

      <form className="flex flex-wrap gap-2 items-end" action="/children" method="GET">
        <div className="flex-1 min-w-48 max-w-md">
          <label htmlFor="q" className="sr-only">Search</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search name or child code…"
            className="w-full rounded-lg border border-brand-300 px-4 py-2.5 text-base sm:text-sm text-brand-900 focus:outline-none focus:ring-2 focus:ring-action-600/40 bg-white"
          />
        </div>
        <div>
          <label htmlFor="barangay" className="sr-only">Barangay</label>
          <select
            id="barangay"
            name="barangay"
            defaultValue={barangay}
            className="rounded-lg border border-brand-300 px-3 py-2.5 text-sm text-brand-900 bg-white"
          >
            <option value="">All barangays</option>
            {barangays.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="sr-only">Record status</label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="rounded-lg border border-brand-300 px-3 py-2.5 text-sm text-brand-900 bg-white"
          >
            <option value="">All statuses</option>
            {RECORD_STATUSES.map((s) => (
              <option key={s} value={s}>{RECORD_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline" size="md">Filter</Button>
      </form>

      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Child Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Barangay</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Age</th>
              <th className="px-4 py-3 text-left">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-500">No records found.</td>
              </tr>
            ) : (
              result.rows.map((r) => (
                <tr key={r.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-brand-700">{r.childCode}</td>
                  <td className="px-4 py-3">
                    <Link href={`/children/${r.id}`} className="font-medium text-brand-900 hover:text-action-700 underline underline-offset-2">
                      {r.lastName}, {r.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-brand-600">{r.barangayName}</td>
                  <td className="px-4 py-3">
                    <RecordStatusBadge status={r.recordStatus as RecordStatus} />
                  </td>
                  <td className="px-4 py-3 text-brand-600 numeric">{r.age ?? "—"}</td>
                  <td className="px-4 py-3 text-brand-500 text-xs">{formatDate(r.createdAt?.toISOString?.() ?? String(r.createdAt))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-brand-400">
        <span>Showing {result.rows.length} of {result.total} records · Page {result.page} of {totalPages}</span>
        <div className="flex gap-2">
          {result.page > 1 && (
            <Link href={`/children?page=${result.page - 1}&q=${encodeURIComponent(q)}`} className="hover:text-brand-700">← Prev</Link>
          )}
          {result.page < totalPages && (
            <Link href={`/children?page=${result.page + 1}&q=${encodeURIComponent(q)}`} className="hover:text-brand-700">Next →</Link>
          )}
        </div>
      </div>
    </div>
  );
}
