# Acceptance Tests (Manual QA)

> STATUS: **PLAN** — executed after implementation phases; check items only
> when actually performed against a seeded dev database (`npm run seed`, fictional data).

## Environment

- [ ] `npm run db:push` (or migrate) on fresh `local.db`
- [ ] `npm run seed` — school demo data (fictional), all roles' users available
- [ ] `npm run dev` boots without errors

## Journey: System Administrator

- [ ] Login → dashboard renders school KPIs (no municipal wording anywhere)
- [ ] Create users for each role; disable a user; disable-attempt on last admin is blocked
- [ ] Configure: school profile, school year, grade levels, sections (+adviser), subjects, grading periods, grading scale, assessment levels, monitoring rules
- [ ] Activity logs show expected vocabulary; settings changes audited

## Journey: Records Personnel

- [ ] Add student (with guardian); duplicate flow triggers on second similar student
- [ ] Enroll student into current year/grade/section; verify history row on next-year enrollment
- [ ] Verification queue: approve / needs-correction flows update profile status
- [ ] Duplicates review: confirm + dismiss; no auto-merge ever occurs
- [ ] Export student master list (PDF/XLSX) with filters

## Journey: Teacher / Adviser

- [ ] Registry scoped to assigned sections only (verify no cross-section access by URL manipulation)
- [ ] Attendance roster: record, correct, rates visible
- [ ] Grade entry grid: encode per subject/period; scale validation rejects out-of-range
- [ ] Record reading assessment for a student; level list matches configuration
- [ ] Behavior note (positive + concern); concern follow-up recorded

## Journey: Guidance

- [ ] Behavior casework view; interventions create → follow-ups → complete with outcome
- [ ] Reading/literacy/numeracy views; "Recommended for Support" lists render neutrally
- [ ] No grade editing capability anywhere (UI + direct action call rejected)

## Journey: School Administrator

- [ ] All-students views; analytics dashboards correct vs seeded data
- [ ] Reports: grade-level/section performance, school-year comparison
- [ ] Cannot manage users (per matrix) — users nav hidden; direct URL denied

## Cross-Cutting

- [ ] All obsolete routes 404/redirect: `/register`, `/monitoring`, old child URLs
- [ ] Search across app returns only permitted records
- [ ] Loading skeletons appear on slow navigation; empty states helpful; error boundary recovers
- [ ] Mobile: registry card-list, roster usability, filters disclosure
- [ ] Keyboard-only pass on create-student form and login
- [ ] QR: generate from profile → public verify shows code+status only; revoke works
- [ ] Every dashboard number traceable to seeded DB rows (spot check 5 KPIs via SQL)
- [ ] No hardcoded statistics observed when DB is emptied (all charts zero/empty states)
