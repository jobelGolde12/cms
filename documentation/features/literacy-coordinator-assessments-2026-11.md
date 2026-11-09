# Literacy Coordinator — Assessment Entry and Editing (2026-11)

> **Implementation record**, not a plan. The Language & Literacy Coordinator
> can now **add** and **edit** Phil-IRI, Literacy and Numeracy assessments on a
> student profile. Complements the domain design in `features/literacy.md`.

---

## 1. The defect that was fixed

The `saveAssessment` server action existed and was correctly guarded, **but no
screen ever called it**. The assessments panel rendered the list read-only, so
the Literacy Coordinator could look at an assessment but could not record one —
which is the one thing the role exists for.

> The root cause was not a permission problem: it was a missing UI. The
> permission (`assessments.write`) was already granted to
> `literacy_coordinator`.

---

## 2. What was built

| File | Role |
|---|---|
| `src/lib/assessment-levels.ts` | reads the proficiency levels from `system_settings.assessment_levels` (with the constants as fallback) |
| `src/components/students/assessment-form.tsx` | the add/edit form (domain, type, date, level, score, skill area, notes) |
| `src/components/students/assessments-panel.tsx` | the list plus the **Add assessment** button and a per-record **Edit** button |
| `src/app/(app)/students/[id]/page.tsx` | mounts the panel and decides who may write |
| `src/actions/records.ts` → `saveAssessment` | the server-side save (permission, ownership, validation, audit) |

### 2.1 Configurable levels

The level list is **data**, not code:

```json
// system_settings → key "assessment_levels"
{
  "reading":  ["Beginning", "Developing", "Approaching", "Proficient"],
  "literacy": ["Beginning", "Developing", "Approaching", "Proficient"],
  "numeracy": ["Beginning", "Developing", "Approaching", "Proficient"]
}
```

`getAssessmentLevels()` parses the setting defensively (a malformed or missing
row falls back to `DEFAULT_ASSESSMENT_LEVELS` per domain) and the form renders
a **domain-aware** level list: choosing *Reading* shows the reading levels,
choosing *Numeracy* shows the numeracy levels. The school can change the
labels from **Settings** without touching the code.

### 2.2 Add and edit

* **Add** — the *Add assessment* button opens the form with an empty record.
* **Edit** — every row in the list carries an *Edit* button that opens the same
  form pre-filled with that record.
* The domain, assessment type and date are editable; the assessment is always
  attached to the student whose profile is open.

### 2.3 No data loss

`useFormResetGuard` (the shared form-reset guard) keeps the in-progress form
alive when the surrounding list re-renders, and the form is only reset after a
**successful** save. Cancelling an edit leaves the stored record untouched.

### 2.4 Ownership check on the edit path (security fix)

The edit path now loads the existing row and rejects a submission whose
`studentId` does not match the stored record:

```ts
// src/actions/records.ts → saveAssessment (edit branch)
const existing = await db.select({ studentId: assessments.studentId })
  .from(assessments).where(eq(assessments.id, id)).limit(1);
if (!existing[0] || existing[0].studentId !== studentId) {
  return { ok: false, error: "That assessment does not belong to this student." };
}
```

Without this check a crafted request could have rewritten another student's
assessment. The action also re-checks `assessments.write` server-side, so
hiding the button is never the control.

### 2.5 Cache invalidation

`saveAssessment` revalidates `/students`, `/students/[id]`, `/development` and
`/performance` so the profile, the Student Development dashboard and the
performance analytics all reflect the change immediately. (The old
`/development/assessments` path never existed — it was a dead invalidation
target and has been corrected.)

---

## 3. Who can do what

| Role | `assessments.view` | `assessments.write` | Result |
|---|---|---|---|
| literacy_coordinator | ✓ | ✓ | add + edit Phil-IRI / Literacy / Numeracy |
| teacher (Adviser) | ✓ | ✓ | add + edit in their own sections |
| records | ✓ | — | read only |
| registrar | ✓ | — | read only |
| guidance / nurse / admin_officer | — | — | not reachable |
| admin / school_admin | ✓ | ✓ | add + edit |

No unrelated permission was granted to the Literacy Coordinator: the role still
holds no grades, attendance, behavior, health, user-management or settings
rights.

---

## 4. Tests and verification

| Check | Result |
|---|---|
| `npm run lint` | 0 errors, 0 warnings |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 26 files / 322 tests passing |
| `npm run build` | exit 0 — every route compiled |
| Manual | add → list shows the record → edit → list shows the change → cancel leaves the record untouched |
