"use client";

import { useState } from "react";
import { AssessmentForm, type AssessmentRow } from "@/components/students/assessment-form";
import { Button } from "@/components/ui/button";
import {
  ASSESSMENT_DOMAIN_LABELS,
  type AssessmentDomain,
} from "@/lib/constants";
import type { AssessmentLevels } from "@/lib/assessment-levels";
import { formatDate } from "@/lib/utils";

/**
 * The learner's assessment list plus the add/edit controls.
 *
 * Read-only for everyone who may only VIEW assessments (Registrar, Records,
 * Adviser, …); the Language & Literacy Coordinator — and every other role
 * holding `assessments.write` — gets the add form and a per-record Edit
 * button. The write permission itself is enforced server-side by
 * `saveAssessment`; this component only decides what to render.
 */
export function AssessmentsPanel({
  studentId,
  levels,
  assessments,
  canWrite,
}: {
  studentId: string;
  levels: AssessmentLevels;
  assessments: AssessmentRow[];
  canWrite: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {assessments.length === 0 ? (
        <p className="text-sm text-[#64748B]">No assessment records.</p>
      ) : (
        <ul className="divide-y divide-brand-100">
          {assessments.map((a) => {
            const editing = editingId === a.id;
            const domainLabel =
              ASSESSMENT_DOMAIN_LABELS[a.domain as AssessmentDomain] ?? a.domain;
            return (
              <li key={a.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-brand-900">
                    {domainLabel}
                    {a.assessmentType ? (
                      <span className="text-[#64748B]"> · {a.assessmentType}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-[#64748B]">
                    {a.level ?? "—"}
                    {a.score != null ? (
                      <span className="numeric"> · {a.score}</span>
                    ) : null}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-brand-400">
                  {formatDate(a.date)}
                  {a.assessorFirst || a.assessorLast ? (
                    <span> · {a.assessorFirst} {a.assessorLast}</span>
                  ) : null}
                </div>
                {a.skillArea ? (
                  <div className="mt-0.5 text-xs text-brand-400">{a.skillArea}</div>
                ) : null}
                {a.notes ? (
                  <div className="mt-0.5 text-xs text-[#64748B]">{a.notes}</div>
                ) : null}
                {canWrite && !editing ? (
                  <div className="mt-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAdding(false);
                        setEditingId(a.id);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ) : null}
                {canWrite && editing ? (
                  <div className="mt-2">
                    <AssessmentForm
                      studentId={studentId}
                      levels={levels}
                      assessment={a}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => setEditingId(null)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canWrite ? (
        adding ? (
          <AssessmentForm
            studentId={studentId}
            levels={levels}
            onCancel={() => setAdding(false)}
            onSaved={() => setAdding(false)}
          />
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            Add assessment
          </Button>
        )
      ) : null}
    </div>
  );
}
