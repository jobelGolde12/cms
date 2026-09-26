import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { validationQueue, validationStats } from "@/lib/queries";
import { reviewValidationForm } from "@/actions/children";
import { hasPermission } from "@/lib/permissions";
import { ageFromBirthDate, cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { ShieldCheck } from "lucide-react";
import {
  ValidationKpiGrid,
  ValidationPageHeader,
} from "@/components/validation/validation-ui";

export default async function ValidationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";

  const [queue, stats] = await Promise.all([validationQueue(user), validationStats(user)]);
  const canReview = hasPermission(user.role, "validation.review");

  const filtered = q
    ? queue.filter(
        (item) =>
          `${item.firstName} ${item.lastName}`.toLowerCase().includes(q) ||
          item.childCode.toLowerCase().includes(q) ||
          item.barangayName.toLowerCase().includes(q),
      )
    : queue;

  return (
    <div className="space-y-5">
      <ValidationPageHeader stats={stats} />

      <ValidationKpiGrid stats={stats} />

      <section
        aria-label="Validation queue"
        className="rounded-lg border border-brand-200 bg-white shadow-xs"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-brand-900">Pending Initial Review</h2>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              {filtered.length} record{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
          <form action="/validation" method="GET" className="w-full sm:w-64">
            <label htmlFor="queue-search" className="sr-only">
              Search the validation queue
            </label>
            <input
              id="queue-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search name, ID, or barangay…"
              className="h-8 w-full rounded-md border border-brand-200 bg-[#f8fafc] px-3 text-xs text-brand-800 placeholder:text-brand-400 focus:border-action-500 focus:bg-white focus:outline-none"
            />
          </form>
        </header>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-10 w-10" />}
            title={q ? "No matching records" : "No records pending validation"}
            description={
              q
                ? "Try a different name, mapping ID, or barangay."
                : "Submitted child records will appear here for review."
            }
          />
        ) : (
          <ul className="divide-y divide-brand-100">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-brand-50/60"
              >
                <div className="min-w-0">
                  <div className="numeric text-[11px] font-semibold text-brand-500">
                    {item.childCode}
                  </div>
                  <a
                    href={`/children/${item.id}`}
                    className="text-[14px] font-semibold text-brand-900 hover:text-action-700"
                  >
                    {item.lastName}, {item.firstName}
                  </a>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-brand-500">
                    <span>{item.barangayName}</span>
                    <span aria-hidden="true">•</span>
                    <span>DOB {formatDate(item.birthDate)}</span>
                    <span aria-hidden="true">•</span>
                    <span>Age {ageFromBirthDate(item.birthDate) ?? "—"}</span>
                    {item.submitterFirst ? (
                      <>
                        <span aria-hidden="true">•</span>
                        <span>
                          Submitted by {item.submitterFirst} {item.submitterLast}
                          {item.submittedAt
                            ? ` · ${new Date(item.submittedAt).toLocaleDateString("en-PH")}`
                            : ""}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                {canReview ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={reviewValidationForm} className="flex items-center gap-1.5">
                      <input type="hidden" name="childId" value={item.id} />
                      <input
                        type="hidden"
                        name="remarks"
                        value={`Approved from queue ${item.childCode}`}
                      />
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={reviewValidationForm} className="flex items-center gap-1.5">
                      <input type="hidden" name="childId" value={item.id} />
                      <input type="hidden" name="decision" value="needs_correction" />
                      <input
                        type="hidden"
                        name="remarks"
                        value="Returned from validation queue"
                      />
                      <Button type="submit" variant="outline" size="sm">
                        Return for correction
                      </Button>
                    </form>
                    <form action={reviewValidationForm} className="flex items-center gap-1.5">
                      <input type="hidden" name="childId" value={item.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <input type="hidden" name="remarks" value="Rejected from validation queue" />
                      <Button type="submit" variant="danger" size="sm">
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
