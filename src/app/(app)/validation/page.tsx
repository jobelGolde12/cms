import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { validationQueue } from "@/lib/queries";
import { reviewValidationForm } from "@/actions/children";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { ShieldCheck } from "lucide-react";

export default async function ValidationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const queue = await validationQueue(user);
  const canReview = hasPermission(user.role, "validation.review");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Validation Queue</h1>
        <p className="mt-1 text-sm text-brand-500">
          Records submitted for review. Approving marks the record verified; returns require the collector to correct and resubmit.
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-xl border border-brand-200 bg-white shadow-sm">
          <EmptyState
            icon={<ShieldCheck className="h-10 w-10" />}
            title="No records pending validation"
            description="Submitted child records will appear here for review."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div key={item.id} className="rounded-xl border border-brand-200 bg-white shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-brand-500">{item.childCode}</div>
                  <a href={`/children/${item.id}`} className="font-semibold text-brand-900 hover:text-action-700">
                    {item.lastName}, {item.firstName}
                  </a>
                  <div className="text-xs text-brand-500 mt-0.5">
                    {item.barangayName} · born {item.birthDate}
                    {item.submitterFirst ? ` · submitted by ${item.submitterFirst} ${item.submitterLast}` : ""}
                    {item.submittedAt ? ` · ${new Date(item.submittedAt).toLocaleDateString("en-PH")}` : ""}
                  </div>
                </div>
                {canReview ? (
                  <div className="flex flex-wrap gap-2">
                    <form action={reviewValidationForm}>
                      <input type="hidden" name="childId" value={item.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <Button type="submit" size="sm">Approve</Button>
                    </form>
                    <form action={reviewValidationForm}>
                      <input type="hidden" name="childId" value={item.id} />
                      <input type="hidden" name="decision" value="needs_correction" />
                      <Button type="submit" variant="outline" size="sm">Needs correction</Button>
                    </form>
                    <form action={reviewValidationForm}>
                      <input type="hidden" name="childId" value={item.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <Button type="submit" variant="danger" size="sm">Reject</Button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
