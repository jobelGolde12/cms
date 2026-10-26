# Enhancement Plan — Grade Management, Section-Based Reporting & Project Hardening

**Date:** 2026-10-26
**Scope:** Full audit of the Sta. Magdalena NHS Records Management System, followed by a
prioritized plan for the grade-encoding feature and every relevant weakness found along the way.
This plan was written *before* implementation; implemented items are marked ✅ in
`documentation/features/grade-encoding.md` and the final summary.

---

## Phase 1 — Audit summary (what exists today)

| Area | Finding |
|---|---|
| Auth | Session-based (hashed tokens in `sessions`), `requireUser` / `requirePermission` / `getAuthorizedUser` guards; 9 roles; server-side permission map (`src/lib/permissions.ts`). |
| Row scope | `src/lib/scope.ts`: teachers = adviser sections only; other student-facing roles = school-wide; admin_officer = none. Enforced on every read *and* write path. |
| Grade schema | `student_grades` (enrollment × subject × grading period, unique triple, `recorded_by`) — structurally sound. **No status/lifecycle column** → no draft vs submitted concept. |
| Grade UI | **None.** `saveGrade` action exists but no page or component ever renders a grade form — teachers currently have no way to encode grades at all. Grades are displayed read-only on the student detail page. |
| Grade permission | `grades.write` currently held by **admin, school_admin and teacher**. Requirement says teachers/advisers only. |
| Reports | 15 report types; `buildReport()` already accepts `gradeLevelId`/`sectionId`, but the reports pages pass `{}` — the filters are dead code from the UI. Exports exist (PDF/XLSX with audit + permission `reports.export`). |
| Weaknesses found | (R-1) `school_year_comparison` ignores the teacher scope entirely. (R-2) reading/literacy/numeracy/behavior/intervention reports have **no section or school-year filter**. (R-3) Report context (SY/grade/section/subject/period) is not displayed prominently in the detail view. (R-4) Export API ignores subject/grading-period context. (R-5) No report filter UI. |

---

## Phase 12/13 — Prioritized enhancements

Priority scale: **Critical** (data integrity / security) · **High** (core workflow) ·
**Medium** (usability / consistency) · **Low** (polish, deferred).

### C1. Teacher/adviser-only grade writes — **Critical**
1. **Problem:** server action `saveGrade` accepts any role holding `grades.write`, incl. admin & school_admin; other roles could POST the form directly.
2. **Why it matters:** explicit school rule — "Teachers/Advisers are the only users allowed to input and modify student grades"; also required for accountability of grade records.
3. **Affected area:** `src/actions/*`, `src/lib/permissions.ts`, role matrix, tests, docs.
4. **Solution:** new shared guard `requireGradeWriter()` (role === `teacher`, permission `grades.write`) used by every grade-mutating action; remove `grades.write` from ADMIN/SCHOOL_ADMIN maps;adecimal role matrix updated; enforcement via `hasPermission` (UI) **and** role check (server), never via hidden buttons.
5. **Dependencies:** none. 6. **Risks:** admin loses direct write path (accepted per spec; corrections run through teachers). 7. **Testing:** attempted direct action calls by non-teacher roles, RBAC unit tests.
8. **Priority:** Critical. ✅ implemented

### C2. Grade data-integrity context guard — **Critical**
1. **Problem:** grade rows are tied to `(enrollment, subject, grading_period)` but nothing validates that the grading period belongs to the enrollment's school year, or that the student is actually active in the section being encoded.
2. **Solution:** every grade action re-verifies section↔SY↔period↔enrollment relationships atomically inside a transaction; unique index already prevents duplicates.
3. **Priority:** Critical. ✅ implemented

### H1. Section-based grade encoding workflow — **High**
1. **Problem:** no grade-entry UI exists; per-student navigation would be the previous pattern's failure mode.
2. **Solution:** new `/grades` page with cascade **School Year → Grade Level → Section → Subject → Grading Period** (options required server-side, no client data fetching), roster table for the section with inline per-student inputs (keyboard navigation), draft persistence, unsaved-change protection, loading/empty states following the existing design system.
3. **Priority:** High. ✅ implemented

### H2. Draft → Review → Submitted lifecycle with correction workflow — **High**
1. **Problem:** grades were instant-mutate with no staging or submission semantics; no completeness check; no lock.
2. **Solution:** `student_grades.status ∈ {draft, submitted}` + new `grade_submissions` ledger table per (section, subject, grading period). Draft rows persist indefinitely (survive refresh/login). Submission validates completeness (blocks with a named missing/invalid list) then locks the context. Submitted grades cannot be silently edited: the adviser (and only the adviser who submitted) can **reopen** the context, which flips rows back to `draft` and is fully audit-logged — no irreversible lock.
3. **Priority:** High. ✅ implemented

### H3. Section-based report filtering — **High**
1. **Problems:** R-1..R-5 above (no filter UI, ignored scope, missing section context in reports, export params ignored).
2. **Solution:** shared server-side filter state (`sy`, `section`, `gradeLevel`, `subject`, `period`, `domain`) readable from `searchParams` in the reports index/detail pages *and* the export API (server filter, not client-side). Section filters run in SQL (backend queries), never as post-load filtering. Context chips shown prominently in the detail view. `school_year_comparison` scoped. Assessment/behavior/intervention reports gain section + school-year filters.
3. **Priority:** High. ✅ implemented

### M1. Student detail grade statuses — **Medium**
Grade rows on `/students/[id]` now show Draft/Submitted badges, and advisers get a link into `/grades` context. ✅ implemented

### M2. Navigation entry — **Medium**
"Grade Encoding" nav link (Core Modules) gated by `grades.view`; `grades` icon already existed in the icon map. ✅ implemented

### M3. Permission-map / DB seed consistency — **Medium**
The map is the enforcement source; `scripts/seed.mts` already mirrors it. Doc matrix updated; a re-seed (or the settings sync) will converge DB rows — documented as a runbook step. ✅ documented

### L1. Deferred / future (not implemented in this pass)
- Ad-hoc "academics.config" UI for sections/subjects/periods and adviser assignment (currently seed-managed).
- Grade-wide CSV import from SF5/SF9 spreadsheets; SF9 layout PDF.
- Optimization: `unstable_cache` for reference data; forecasts unaffected (already invalidated on grade writes).
- E2E browser tests for grade encoding (unit + build verification used instead).

---

## Test plan (Phase 15 summary)
- Teacher: load `/grades`, cascade selection, encode, save draft, reload, re-login, resume, submit, reopen, re-correct.
- Non-teacher roles: grade sheet is read-only; server actions reject with permissions/role errors; admins can no longer write grades.
- Reports: filters per type, scope enforcement (teacher sees only own sections), context chips, exports honor filters.
- Data: unique triple prevents duplicates; wrong-period/wrong-section submissions rejected; existing rows unaffected by migration (additive).
