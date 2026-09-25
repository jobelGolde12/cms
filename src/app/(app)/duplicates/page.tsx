import { redirect } from "next/navigation";
import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listDuplicates } from "@/lib/queries";
import { reviewDuplicate } from "@/actions/duplicates";
import { hasPermission } from "@/lib/permissions";
import { DUPLICATE_STATUSES, DUPLICATE_STATUS_LABELS, type DuplicateStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

/** FormData-only wrapper for plain <form action={…}> usage. */
async function reviewDuplicateForm(formData: FormData): Promise<void> {
  "use server";
  await reviewDuplicate({ ok: false, error: "" }, formData);
}

export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "pending";
  const items = await listDuplicates(status);
  const canReview = hasPermission(user.role, "duplicates.review");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Duplicate Review</h1>
        <p className="mt-1 text-sm text-brand-500">
          Possible duplicates require authorized human review — nothing is marked automatically.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["pending", "confirmed_duplicate", "not_duplicate", "dismissed", "all"].map((s) => (
          <Link
            key={s}
            href={`/duplicates?status=${s}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              status === s
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-brand-200 bg-white text-brand-600 hover:border-brand-400"
            }`}
          >
            {s === "all" ? "All" : DUPLICATE_STATUS_LABELS[s as DuplicateStatus]}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-brand-200 bg-white shadow-sm">
          <EmptyState
            icon={<ScanSearch className="h-10 w-10" />}
            title="No duplicate candidates"
            description="Candidate pairs appear here when the detector finds matching identity fields."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-w-0">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-brand-400">Record A</div>
                    <Link href={`/children/${item.childId}`} className="font-semibold text-brand-900 hover:text-action-700">
                      {item.childLast}, {item.childFirst}
                    </Link>
                    <div className="font-mono text-xs text-brand-500">{item.childCode} · born {item.childBirth}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-brand-400">Record B (possible duplicate)</div>
                    <Link href={`/children/${item.possibleChildId}`} className="font-semibold text-brand-900 hover:text-action-700">
                      {item.possibleLast}, {item.possibleFirst}
                    </Link>
                    <div className="font-mono text-xs text-brand-500">{item.possibleCode} · born {item.possibleBirth}</div>
                  </div>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <Badge tone={item.status === "pending" ? "pending" : item.status === "confirmed_duplicate" ? "error" : "neutral"}>
                    {DUPLICATE_STATUS_LABELS[item.status as DuplicateStatus] ?? item.status}
                  </Badge>
                  <div className="text-xs text-brand-500">
                    Match score: <span className="numeric font-bold text-brand-800">{item.matchScore ?? "—"}</span>
                    {item.matchReasons.length > 0 ? ` · ${item.matchReasons.join(", ")}` : ""}
                  </div>
                </div>
              </div>

              {item.reviewNotes ? (
                <p className="mt-3 text-xs text-brand-500 border-t border-brand-100 pt-2">Review notes: {item.reviewNotes}</p>
              ) : null}

              {canReview && item.status === "pending" ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-brand-100 pt-3">
                  <form action={reviewDuplicateForm}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="decision" value="confirmed_duplicate" />
                    <Button type="submit" variant="danger" size="sm">Confirm duplicate</Button>
                  </form>
                  <form action={reviewDuplicateForm}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="decision" value="not_duplicate" />
                    <Button type="submit" variant="outline" size="sm">Not a duplicate</Button>
                  </form>
                  <form action={reviewDuplicateForm}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="decision" value="dismissed" />
                    <Button type="submit" variant="ghost" size="sm">Dismiss</Button>
                  </form>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
