import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, GitCompare, ScanSearch, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listDuplicates, validationStats } from "@/lib/queries";
import { reviewDuplicate } from "@/actions/duplicates";
import { hasPermission } from "@/lib/permissions";
import {
  DUPLICATE_STATUSES,
  DUPLICATE_STATUS_LABELS,
  type DuplicateStatus,
} from "@/lib/constants";
import { ageFromBirthDate, cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import {
  ConfidenceChip,
  DuplicateStatusBadge,
  MatchEvidence,
  RecordComparison,
  ResolutionExplainer,
  ValidationKpiGrid,
  ValidationPageHeader,
  WorkspaceHint,
} from "@/components/validation/validation-ui";

/** FormData-only wrapper for plain <form action={…}> usage. */
async function reviewDuplicateForm(formData: FormData): Promise<void> {
  "use server";
  await reviewDuplicate({ ok: false, error: "" }, formData);
}

const STATUS_TABS = ["pending", "confirmed_duplicate", "not_duplicate", "dismissed", "all"] as const;

const BANDS = [
  { key: "high", label: "High ≥90" },
  { key: "moderate", label: "Moderate 65–89" },
  { key: "review", label: "Review <65" },
] as const;

export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const status = str("status") || "pending";
  const q = str("q").trim();
  const band = str("band");
  const selectedId = str("id");

  const [items, stats] = await Promise.all([
    listDuplicates(status, { q, band: band as "high" | "moderate" | "review" | undefined }),
    validationStats(user),
  ]);
  const canReview = hasPermission(user.role, "duplicates.review");

  const selected =
    items.find((item) => item.id === selectedId) ??
    (items.length > 0 && status === "pending" ? items[0] : undefined);

  const queueQuery = (overrides: Record<string, string>) => {
    const next = new URLSearchParams();
    next.set("status", status);
    if (q) next.set("q", q);
    if (band) next.set("band", band);
    if (selectedId) next.set("id", selectedId);
    for (const [key, value] of Object.entries(overrides)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return `/duplicates?${next}`;
  };

  return (
    <div className="space-y-5">
      <ValidationPageHeader stats={stats} />

      <ValidationKpiGrid stats={stats} />

      {/* -------------------------- Status tabs -------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/duplicates?status=${tab}`}
            className={cn(
              "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors",
              status === tab
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-brand-200 bg-white text-brand-600 hover:border-brand-400",
            )}
          >
            {tab === "all" ? "All" : DUPLICATE_STATUS_LABELS[tab as DuplicateStatus]}
          </Link>
        ))}
      </div>

      {/* ------------------------ Workspace grid ------------------------- */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-5">
        {/* ------------------------ Conflict queue ------------------------ */}
        <section
          aria-label="Conflict queue"
          className="rounded-lg border border-brand-200 bg-white shadow-xs xl:col-span-2"
        >
          <header className="border-b border-brand-100 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-brand-900">Conflict Queue</h2>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                {items.length} shown
              </span>
            </div>
            <form action="/duplicates" method="GET" className="mt-2.5">
              <input type="hidden" name="status" value={status} />
              <label htmlFor="conflict-search" className="sr-only">
                Search conflicts by child name or mapping ID
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-400"
                />
                <input
                  id="conflict-search"
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search child name or mapping ID…"
                  className="h-8 w-full rounded-md border border-brand-200 bg-[#f8fafc] pl-8 pr-3 text-xs text-brand-800 placeholder:text-brand-400 focus:border-action-500 focus:bg-white focus:outline-none"
                />
              </div>
            </form>
            {status === "pending" ? (
              <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Confidence band filter">
                {BANDS.map((b) => (
                  <Link
                    key={b.key}
                    href={queueQuery({ band: band === b.key ? "" : b.key, id: "" })}
                    aria-pressed={band === b.key}
                    className={cn(
                      "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium transition-colors",
                      band === b.key
                        ? "bg-brand-900 text-white"
                        : "bg-brand-100 text-brand-600 hover:bg-brand-200",
                    )}
                  >
                    {b.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </header>

          <div className="max-h-[560px] overflow-y-auto">
            {items.length === 0 ? (
              <EmptyState
                icon={<ScanSearch className="h-9 w-9" />}
                title="No conflicts in this view"
                description="Candidate pairs appear here when the detector finds matching identity fields across records."
              />
            ) : (
              <ul className="divide-y divide-brand-100">
                {items.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <li key={item.id}>
                      <Link
                        href={queueQuery({ id: item.id })}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "block border-l-2 px-4 py-3 transition-colors",
                          active
                            ? "border-l-action-700 bg-action-50/70"
                            : "border-l-transparent hover:bg-brand-50/70",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-brand-500">
                              {item.childCode} vs {item.possibleCode}
                            </div>
                            <div className="mt-0.5 truncate text-[13px] font-semibold text-brand-900">
                              {item.childLast}, {item.childFirst}
                            </div>
                            <div className="mt-0.5 truncate text-[11px] text-brand-500">
                              {item.childBarangayName ?? "—"} vs {item.possibleBarangayName ?? "—"}
                            </div>
                            <div className="mt-0.5 text-[11px] text-brand-400">
                              DOB {formatDate(item.childBirth)}
                              {item.childGrade ? ` · ${item.childGrade}` : ""}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <ConfidenceChip score={item.matchScore} />
                            <DuplicateStatusBadge status={item.status} />
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* --------------------- Selected conflict panel --------------------- */}
        <section
          aria-label="Conflict review"
          className="rounded-lg border border-brand-200 bg-white shadow-xs xl:col-span-3"
        >
          {!selected ? (
            <WorkspaceHint icon={GitCompare}>
              Pick a conflict from the queue to compare the two records side by side and
              record a resolution.
            </WorkspaceHint>
          ) : (
            <>
              <header className="border-b border-brand-100 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle aria-hidden="true" className="h-4 w-4 text-amber-600" />
                      <h2 className="text-sm font-semibold text-brand-900">
                        {selected.matchScore != null
                          ? `Possible duplicate detected — ${selected.matchScore}% identifier agreement`
                          : "Possible duplicate detected"}
                      </h2>
                    </div>
                    <p className="mt-0.5 text-xs text-brand-500">
                      The detector requires at least two independent identifiers to agree
                      before flagging a candidate pair.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConfidenceChip score={selected.matchScore} />
                    <DuplicateStatusBadge status={selected.status} />
                  </div>
                </div>
              </header>

              <div className="space-y-4 px-4 py-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <MatchEvidence item={selected} />
                  </div>
                  <div className="sm:col-span-2">
                    <RecordComparison item={selected} />
                  </div>
                </div>

                {selected.reviewNotes ? (
                  <p className="rounded-md border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-brand-600">
                    Previous review notes: {selected.reviewNotes}
                  </p>
                ) : null}

                {/* --------------------- Resolution --------------------- */}
                <div className="border-t border-brand-100 pt-3">
                  <h3 className="text-[13px] font-semibold text-brand-900">
                    Resolution decision
                  </h3>
                  <ResolutionExplainer />
                  {canReview ? (
                    selected.status === "pending" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <form action={reviewDuplicateForm}>
                          <input type="hidden" name="id" value={selected.id} />
                          <input type="hidden" name="decision" value="confirmed_duplicate" />
                          <Button type="submit" variant="danger" size="sm">
                            Confirm duplicate
                          </Button>
                        </form>
                        <form action={reviewDuplicateForm}>
                          <input type="hidden" name="id" value={selected.id} />
                          <input type="hidden" name="decision" value="not_duplicate" />
                          <Button type="submit" variant="outline" size="sm">
                            Not a duplicate
                          </Button>
                        </form>
                        <form action={reviewDuplicateForm}>
                          <input type="hidden" name="id" value={selected.id} />
                          <input type="hidden" name="decision" value="dismissed" />
                          <Button type="submit" variant="ghost" size="sm">
                            Dismiss
                          </Button>
                        </form>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-brand-500">
                        This conflict has been resolved as{" "}
                        <strong>{DUPLICATE_STATUS_LABELS[selected.status as DuplicateStatus]}</strong>.
                        Switch to the All tab to review it again.
                      </p>
                    )
                  ) : (
                    <p className="mt-3 text-xs text-brand-500">
                      You do not have permission to resolve duplicate conflicts. Contact an
                      LGU administrator.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
