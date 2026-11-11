"use client";

import { useActionState } from "react";
import { CalendarClock } from "lucide-react";
import { setSubmissionDeadline } from "@/actions/grade-monitoring";
import type { ActionState } from "@/actions/helpers";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export type DeadlinePeriod = {
  id: string;
  name: string;
  schoolYear: string;
  deadline: string | null;
  startDate: string | null;
  endDate: string | null;
};

const INITIAL: ActionState = { ok: false, error: "" };

function DeadlineForm({ period }: { period: DeadlinePeriod }) {
  const [state, formAction, pending] = useActionState(setSubmissionDeadline, INITIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 border-b border-brand-100 py-3 last:border-0">
      <input type="hidden" name="gradingPeriodId" value={period.id} />
      <div className="min-w-[120px]">
        <p className="text-sm font-semibold text-brand-900">{period.name}</p>
        <p className="text-xs text-[#64748B]">{period.schoolYear}</p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`deadline-${period.id}`} className="text-xs font-medium text-brand-700">
          Submission deadline
        </label>
        <Input
          id={`deadline-${period.id}`}
          name="deadline"
          type="date"
          defaultValue={period.deadline ?? ""}
          className="h-9 w-[170px]"
        />
        {state.ok === false && state.error ? (
          <p role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {state.ok && state.message ? (
        <p role="status" className="text-xs font-medium text-emerald-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Deadline configuration — visible only to roles holding `academics.config`;
 * the server action re-checks the permission, so hiding the card is not the
 * security boundary.
 */
export function DeadlineConfig({ periods }: { periods: DeadlinePeriod[] }) {
  if (periods.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Submission deadlines"
        description="Deadlines are authoritative end-of-day dates in Asia/Manila (Philippines). Leave blank to disable lateness tracking for a period."
        icon={<CalendarClock aria-hidden="true" className="h-4 w-4" />}
      />
      <CardBody>
        <div className="space-y-0">
          {periods.map((period) => (
            <DeadlineForm key={period.id} period={period} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
