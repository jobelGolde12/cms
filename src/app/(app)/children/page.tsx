import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listChildren } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  const pageParam = typeof params.page === "string" ? params.page : "1";
  const result = await listChildren(user, {
    q,
    page: parseInt(pageParam, 10) || 1,
    sort: "recent",
  });

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

      <form className="flex flex-wrap gap-2" action="/children" method="GET">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, code, barangay..."
          className="w-full sm:max-w-md rounded-lg border border-brand-300 px-4 py-2.5 text-base sm:text-sm text-brand-900 focus:outline-none focus:ring-2 focus:ring-action-600/40 bg-white"
        />
        <Button type="submit" variant="outline" size="md">Search</Button>
      </form>

      <div className="rounded-xl border border-brand-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-100/60 text-xs font-semibold uppercase text-brand-600 tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Child Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Barangay</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Age</th>
              <th className="px-4 py-3 text-left">Updated</th>
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
                      {r.firstName} {r.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-brand-600">{r.barangayName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.validationStatus === "verified" ? "verified" : r.validationStatus === "pending_validation" ? "pending" : "neutral"}>
                      {r.validationStatus.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-brand-600">{r.age ?? "—"}</td>
                  <td className="px-4 py-3 text-brand-500 text-xs">{formatDate(r.createdAt?.toISOString?.() ?? r.createdAt as unknown as string)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-brand-400">Showing {result.rows.length} of {result.total} records · Page {result.page}</div>
    </div>
  );
}
