"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2, UserRound, BookOpen } from "lucide-react";
import {
  assignAdviser,
  assignSubjectTeacher,
  clearAdviser,
  removeSubjectTeacher,
} from "@/actions/assignments";
import type { ActionState } from "@/actions/helpers";
import type {
  AssignmentSectionOption,
  AssignmentTeacherOption,
  SubjectTeacherAssignment,
} from "@/lib/assignments";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-status";
import { useFormResetGuard } from "@/components/ui/form-reset-guard";
import { TableEmptyState, TableWrap, Td, Th } from "@/components/ui/table";

const initial: ActionState = { ok: false, error: "" };

const sectionLabel = (s: AssignmentSectionOption) =>
  `${s.gradeLevelName} — ${s.name} (SY ${s.schoolYear})`;

const teacherLabel = (t: AssignmentTeacherOption) =>
  t.canTeachSubject ? t.name : `${t.name} (adviser only)`;

function ResultMessage({ state }: { state: ActionState }) {
  if (state.ok) {
    return state.message ? (
      <p
        role="status"
        className="flex items-start gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
      >
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        {state.message}
      </p>
    ) : null;
  }
  return state.error ? (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      {state.error}
    </p>
  ) : null;
}

/** Shared shell for the two assignment forms. */
function AssignmentForm({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initial);
  const { formRef, onReset, resetNow } = useFormResetGuard();

  useEffect(() => {
    if (state.ok) {
      resetNow();
      router.refresh();
    }
  }, [state, resetNow, router]);

  return (
    <Card>
      <CardHeader title={title} description={description} icon={icon} />
      <CardBody>
        <form ref={formRef} action={formAction} onReset={onReset} className="space-y-3">
          {children}
          <ResultMessage state={state} />
          <SubmitButton
            className={buttonStyles("primary", "sm")}
            pendingLabel="Saving…"
          >
            Save assignment
          </SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}

/** Per-row remove control with its own inline result. */
function RemoveAssignment({
  action,
  field,
  value,
  label,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  field: "sectionId" | "assignmentId";
  value: string;
  label: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initial);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name={field} value={value} />
      <SubmitButton
        className={buttonStyles("outline", "sm")}
        pendingLabel="Removing…"
        aria-label={label}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4 text-red-700" />
        Remove
      </SubmitButton>
      {!state.ok && state.error ? (
        <p role="alert" className="max-w-56 text-right text-xs font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function AssignmentManager({
  sections,
  teachers,
  subjects,
  assignments,
}: {
  sections: AssignmentSectionOption[];
  teachers: AssignmentTeacherOption[];
  subjects: { id: string; name: string; code: string }[];
  assignments: SubjectTeacherAssignment[];
}) {
  const loadsBySection = new Map<string, SubjectTeacherAssignment[]>();
  for (const load of assignments) {
    const list = loadsBySection.get(load.sectionId) ?? [];
    list.push(load);
    loadsBySection.set(load.sectionId, list);
  }

  const canAssignSubject = teachers.some((t) => t.canTeachSubject);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <AssignmentForm
          title="Assign an adviser"
          description="One adviser per section. The adviser sees its students in the advisory views; grade encoding still requires a subject-teacher load for the exact subject."
          icon={<UserRound aria-hidden="true" className="h-4 w-4" />}
          action={assignAdviser}
        >
          <Field label="Section" htmlFor="adviser-section" required>
            <Select id="adviser-section" name="sectionId" required defaultValue="">
              <option value="" disabled>
                Select a section
              </option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {sectionLabel(s)}
                  {s.adviserName ? ` — adviser: ${s.adviserName}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Teacher"
            htmlFor="adviser-teacher"
            required
            hint="Active accounts holding Adviser or Subject Teacher. The Adviser role is granted automatically."
          >
            <Select id="adviser-teacher" name="teacherId" required defaultValue="">
              <option value="" disabled>
                Select a teacher
              </option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.email}
                </option>
              ))}
            </Select>
          </Field>
        </AssignmentForm>

        <AssignmentForm
          title="Assign a subject teacher"
          description="One teacher per section and subject. This is the grade-encoding load: the teacher can encode only this subject in this section."
          icon={<BookOpen aria-hidden="true" className="h-4 w-4" />}
          action={assignSubjectTeacher}
        >
          <Field label="Section" htmlFor="load-section" required>
            <Select id="load-section" name="sectionId" required defaultValue="">
              <option value="" disabled>
                Select a section
              </option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {sectionLabel(s)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subject" htmlFor="load-subject" required>
              <Select id="load-subject" name="subjectId" required defaultValue="">
                <option value="" disabled>
                  Select a subject
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Teacher"
              htmlFor="load-teacher"
              required
              hint={
                canAssignSubject
                  ? "The Subject Teacher role is granted automatically."
                  : "No account holds the Subject Teacher role yet — grant it on the Users page."
              }
            >
              <Select
                id="load-teacher"
                name="teacherId"
                required
                disabled={!canAssignSubject}
                defaultValue=""
              >
                <option value="" disabled>
                  Select a teacher
                </option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id} disabled={!t.canTeachSubject}>
                    {teacherLabel(t)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </AssignmentForm>
      </div>

      <Card>
        <CardHeader
          title="Current assignments"
          description="Adviser and subject-teacher assignments for the selected school year. An account can appear in both roles — that is the Adviser + Subject Teacher setup."
          icon={<UserRound aria-hidden="true" className="h-4 w-4" />}
        />
        <TableWrap minWidth={860}>
          <thead>
            <tr>
              <Th>Grade level</Th>
              <Th>Section</Th>
              <Th>Assignment</Th>
              <Th>Subject</Th>
              <Th>Teacher</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {sections.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                icon={<BookOpen className="h-10 w-10" />}
                title="No active sections"
                description="Create or re-activate a section for this school year before assigning teachers."
              />
            ) : (
              sections.flatMap((section) => {
                const loads = loadsBySection.get(section.id) ?? [];
                const rows: ReactNode[] = [];

                if (section.adviserId && section.adviserName) {
                  rows.push(
                    <tr key={`${section.id}-adviser`} className="transition-colors hover:bg-brand-50/70">
                      <Td>{section.gradeLevelName}</Td>
                      <Td className="font-medium text-brand-900">{section.name}</Td>
                      <Td>
                        <Badge tone="verified">Adviser</Badge>
                      </Td>
                      <Td className="text-[#64748B]">All subjects</Td>
                      <Td>{section.adviserName}</Td>
                      <Td align="right">
                        <div className="flex justify-end">
                          <RemoveAssignment
                            action={clearAdviser}
                            field="sectionId"
                            value={section.id}
                            label={`Remove ${section.adviserName} as adviser of ${section.name}`}
                          />
                        </div>
                      </Td>
                    </tr>,
                  );
                }

                for (const load of loads) {
                  rows.push(
                    <tr key={load.id} className="transition-colors hover:bg-brand-50/70">
                      <Td>{section.gradeLevelName}</Td>
                      <Td className="font-medium text-brand-900">{section.name}</Td>
                      <Td>
                        <Badge tone="info">Subject Teacher</Badge>
                      </Td>
                      <Td>
                        <span className="font-medium text-brand-900">{load.subjectCode}</span>
                        <span className="text-[#64748B]"> — {load.subjectName}</span>
                      </Td>
                      <Td>{load.teacherName}</Td>
                      <Td align="right">
                        <div className="flex justify-end">
                          <RemoveAssignment
                            action={removeSubjectTeacher}
                            field="assignmentId"
                            value={load.id}
                            label={`Remove ${load.teacherName} from ${load.subjectCode} in ${section.name}`}
                          />
                        </div>
                      </Td>
                    </tr>,
                  );
                }

                return rows;
              })
            )}
            {sections.length > 0 &&
            sections.every((s) => !s.adviserId && (loadsBySection.get(s.id) ?? []).length === 0) ? (
              <TableEmptyState
                colSpan={6}
                icon={<UserRound className="h-10 w-10" />}
                title="No teacher assignments yet"
                description="Use the forms above to assign an adviser, a subject teacher, or both."
              />
            ) : null}
          </tbody>
        </TableWrap>
        <p className="border-t border-brand-100 px-4 py-2.5 text-xs text-[#64748B]">
          Removing an assignment revokes that grade-encoding scope immediately. Grades already
          encoded are kept for the record. Accounts keep any other role they hold.
        </p>
      </Card>
    </div>
  );
}

/** Year filter — a GET form keeps the page shareable and works without JS. */
export function SchoolYearFilter({
  years,
  selectedYearId,
}: {
  years: { id: string; year: string }[];
  selectedYearId: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-end gap-2">
      <Field label="School year" htmlFor="assignment-sy">
        <Select
          id="assignment-sy"
          defaultValue={selectedYearId}
          onChange={(e) => {
            const value = e.currentTarget.value;
            router.push(value ? `/assignments?sy=${encodeURIComponent(value)}` : "/assignments");
          }}
          className="min-w-40"
        >
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              SY {y.year}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mb-0.5"
        onClick={() => router.push("/assignments")}
      >
        Current year
      </Button>
    </div>
  );
}
