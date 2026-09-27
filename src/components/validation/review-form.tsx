"use client";

import { useActionState } from "react";
import { reviewValidation } from "@/actions/children";
import { Button } from "@/components/ui/button";

/**
 * Reviewer decision form for a record in the validation queue.
 * Uses the same server action as the queue quick-actions but lets the
 * reviewer type remarks. Server-side guard (permission + status + scope)
 * remains authoritative.
 */
export function ValidationReviewForm({ childId }: { childId: string }) {
  const [state, formAction, pending] = useActionState(reviewValidation, {
    ok: false,
    error: "",
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="childId" value={childId} />

      {state.ok === false && state.error ? (
        <p role="alert" className="text-xs font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p role="status" className="text-xs font-medium text-emerald-700">
          {state.message}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="review-remarks"
          className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-500"
        >
          Review remarks (optional)
        </label>
        <textarea
          id="review-remarks"
          name="remarks"
          rows={3}
          maxLength={500}
          placeholder="Notes for the encoder — required corrections, verification notes…"
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-900 placeholder:text-brand-400 focus:border-action-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="approved" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Approve"}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="needs_correction"
          variant="outline"
          size="sm"
          disabled={pending}
        >
          Return for correction
        </Button>
        <Button
          type="submit"
          name="decision"
          value="rejected"
          variant="danger"
          size="sm"
          disabled={pending}
        >
          Reject
        </Button>
      </div>
    </form>
  );
}
