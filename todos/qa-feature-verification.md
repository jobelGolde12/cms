# QA — Feature Verification Checklist (2026-11-08)

Scope: the implemented RBAC revision, Registrar grade-encoding lockout, TERM 1–3
grading periods, Language & Literacy assessments, Adviser + Subject Teacher
dual-role assignment, assignment-based grade authorization, and the data
cleanup already recorded in `documentation/`.

Rules used while executing this list:

- `[x] ✅ PASSED` = verified against the live app and/or the live Turso `cms`
  database during this QA pass.
- `[ ] ❌ FAILED` = still broken (with the reason).
- `[ ] ⚠️ BLOCKED` = could not be executed because a dependency is unavailable.
- Code inspection alone never counts as a pass.

Environment: Next.js 16.3.5, Turso database `cms`, browser QA through
agent-browser (Chromium). QA-only accounts, one employee record, one section
and two students are tagged `[QA]` / `qa-*` and removed at the end.

---

## 1. Data cleanup — Employees

- [ ] Verify dummy employees are no longer present.
- [ ] Verify legitimate employees still exist.
- [ ] Verify no employee records were accidentally deleted.
- [ ] Verify employee-related pages still load correctly.
- [ ] Verify employee search/filter functionality still works.
- [ ] Verify no UI references deleted dummy employees.

## 2. Data cleanup — Sections

- [ ] Verify dummy sections were removed.
- [ ] Verify legitimate sections were preserved.
- [ ] Verify sections page loads correctly.
- [ ] Verify section creation still works.
- [ ] Verify section editing still works.
- [ ] Verify section assignment functionality still works.

## 3. Data cleanup — Students

- [ ] Verify dummy students were removed.
- [ ] Verify legitimate students were preserved.
- [ ] Verify student listing still works.
- [ ] Verify student search works.
- [ ] Verify student profile pages still work.
- [ ] Verify student enrollment records are not broken.
- [ ] Verify deleted dummy students do not appear in dropdowns.
- [ ] Verify deleted dummy students do not appear in reports.
- [ ] Verify deleted dummy students do not appear in analytics.

## 4. Dependent records / orphan scan

- [ ] Student grades
- [ ] Student enrollments
- [ ] Attendance
- [ ] Behavior records
- [ ] Interventions
- [ ] Health/nutritional records
- [ ] Clinical records
- [ ] Phil-IRI records (`assessments.domain = reading`)
- [ ] Literacy records (`assessments.domain = literacy`)
- [ ] Numeracy records (`assessments.domain = numeracy`)
- [ ] Performance records (derived — no orphan source rows)
- [ ] Teacher assignments
- [ ] Adviser assignments

## 5. Database safety

- [ ] Correct Turso database is being used (`cms`).
- [ ] No unexpected database was modified.
- [ ] Relevant tables still exist.
- [ ] Foreign-key relationships are intact (`PRAGMA foreign_key_check`).
- [ ] No orphaned records exist.
- [ ] No duplicate records were accidentally created.
- [ ] No duplicate employee accounts exist because of dual-role support.
- [ ] No invalid grading-period records exist (no TERM 4 / QUARTER rows).
- [ ] Database queries used by affected pages return successfully.
- [ ] `PRAGMA integrity_check` reports `ok`.

## 6. Registrar role — UI

- [ ] Login as Registrar.
- [ ] Registrar dashboard loads.
- [ ] Grade Encoding is NOT visible.
- [ ] Grade Encoding is not present in sidebar navigation.
- [ ] Grade Encoding is not present in mobile navigation.
- [ ] No Grade Encoding button appears through another page.

## 7. Registrar role — direct access and backend

- [ ] Direct `/grades` URL access is blocked.
- [ ] Unauthorized user receives the correct behavior (redirect, no grade page).
- [ ] No grade-encoding sheet is rendered.
- [ ] Registrar cannot submit grades through the server action.
- [ ] Registrar cannot modify grades through a direct request.
- [ ] Registrar cannot bypass authorization through a direct request.
- [ ] Unauthorized actions return the appropriate error/response.

## 8. Registrar — legitimate features

- [ ] Student viewing.
- [ ] Student records/profile.
- [ ] Student card/printing where applicable.
- [ ] Form 137 functionality where applicable.
- [ ] Search/filter.
- [ ] Logout.

## 9. Grading periods — UI

- [ ] Grade Encoding displays TERM 1.
- [ ] Grade Encoding displays TERM 2.
- [ ] Grade Encoding displays TERM 3.
- [ ] TERM 4 does not appear.
- [ ] QUARTER 1 does not appear in the current workflow.
- [ ] QUARTER 2 does not appear.
- [ ] QUARTER 3 does not appear.
- [ ] QUARTER 4 does not appear.

## 10. Grading periods — entry and isolation

- [ ] Grades can be entered for TERM 1.
- [ ] Grades can be entered for TERM 2.
- [ ] Grades can be entered for TERM 3.
- [ ] Grades are saved under the correct term.
- [ ] Grades can be retrieved under the correct term.
- [ ] Editing a TERM 1 grade does not modify TERM 2/3.
- [ ] Editing a TERM 2 grade does not modify TERM 1/3.
- [ ] Editing a TERM 3 grade does not modify TERM 1/2.

## 11. Reports / analytics terminology

- [ ] Student performance reports use TERM terminology.
- [ ] Grade reports use TERM terminology.
- [ ] Analytics use TERM terminology.
- [ ] Filters use TERM terminology.
- [ ] PDF reports use TERM terminology.
- [ ] Exported data uses TERM terminology.

## 12. Grading periods — database

- [ ] Only valid current terms exist.
- [ ] No unexpected TERM 4 records exist.
- [ ] No broken foreign-key relationships exist.
- [ ] Existing grade records remain associated with the correct grading period.

## 13. Language & Literacy Coordinator — student access

- [ ] Coordinator can view authorized students.
- [ ] Student list loads correctly.
- [ ] Student profile can be opened.
- [ ] Student search works.

## 14. Language & Literacy Coordinator — Phil-IRI

- [ ] Phil-IRI page/tab is accessible.
- [ ] Existing Phil-IRI records can be viewed.
- [ ] New Phil-IRI record can be added.
- [ ] Required fields are validated.
- [ ] Valid data saves successfully.
- [ ] Saved data remains after page refresh.
- [ ] Existing Phil-IRI record can be edited.
- [ ] Edited data persists after refresh.
- [ ] Invalid data is rejected appropriately.
- [ ] Form values are preserved when validation fails.

## 15. Language & Literacy Coordinator — Numeracy

- [ ] Numeracy records can be viewed.
- [ ] Numeracy record can be added.
- [ ] Numeracy record can be edited.
- [ ] Changes persist.
- [ ] Validation works.
- [ ] Error handling works.

## 16. Language & Literacy Coordinator — Literacy

- [ ] Literacy records can be viewed.
- [ ] Literacy record can be added.
- [ ] Literacy record can be edited.
- [ ] Changes persist.
- [ ] Validation works.
- [ ] Error handling works.

## 17. Language & Literacy Coordinator — permission isolation

- [ ] Cannot manage employees.
- [ ] Cannot manage system users.
- [ ] Cannot encode grades.
- [ ] Cannot perform administrative assignments.
- [ ] Cannot delete students.
- [ ] Cannot access restricted modules (sections, users, activity logs, QR, health, guidance).

## 18. Adviser + Subject Teacher — role verification

- [ ] QA employee holds both required roles/responsibilities.
- [ ] System does not force only one role.
- [ ] Employee appears correctly in admin assignment screens.
- [ ] No duplicate employee account is created for the dual role.

## 19. Adviser + Subject Teacher — adviser assignment

- [ ] Adviser assignment saves.
- [ ] Adviser can access assigned section/students.
- [ ] Adviser functionality works normally.
- [ ] Advisory assignment keeps `sections.adviser_id` and the employee link in sync.

## 20. Adviser + Subject Teacher — subject assignment

- [ ] Subject assignment saves.
- [ ] Teacher sees the assigned subject grade encoding.
- [ ] Teacher sees the correct Grade 7 Section A students.
- [ ] Teacher can encode grades.
- [ ] Teacher can save grades.
- [ ] Teacher can retrieve saved grades.
- [ ] Teacher can edit grades when permitted.

## 21. Critical regression — dual role does not block encoding

- [ ] Adviser = YES, Subject Teacher = YES, subject assignment = YES, grade/section assignment = YES → grade encoding ALLOWED.

## 22. Assignment-based authorization scenarios

- [ ] Scenario A — assigned subject (Math): teacher can encode Math.
- [ ] Scenario B — different subject (Science): teacher cannot encode Science.
- [ ] Scenario C — different section: access denied.
- [ ] Scenario D — different grade level: access denied.
- [ ] Scenario E — adviser only, no teaching load: cannot encode grades.
- [ ] Scenario F — subject teacher + adviser: can encode only assigned subjects.
- [ ] Server actions re-check the (section, subject) assignment (not just UI hiding).

## 23. Admin assignment testing

- [ ] Open assignment management.
- [ ] Select grade level/section/employee and assign Adviser.
- [ ] Save adviser assignment successfully.
- [ ] Assignment appears afterward.
- [ ] Select grade level/section/subject/employee and assign Subject Teacher.
- [ ] Save subject assignment successfully.
- [ ] Assignment appears afterward.
- [ ] Assign the same teacher as Adviser + Subject Teacher.
- [ ] Both assignments coexist.
- [ ] No duplicate employee account is created.
- [ ] Both responsibilities appear correctly.
- [ ] Grade encoding works for the dual assignment.

## 24. Invalid assignment testing

- [ ] Duplicate identical assignment is prevented.
- [ ] Duplicate adviser assignment is handled correctly.
- [ ] Invalid teacher cannot be selected.
- [ ] Invalid section cannot be selected.
- [ ] Invalid subject/grade combination is prevented/rejected.
- [ ] Inactive employee cannot be incorrectly assigned.
- [ ] Missing required assignment fields are rejected.
- [ ] Server-side validation rejects forged invalid assignments.
- [ ] Error messages are understandable.
- [ ] Existing valid assignments are not accidentally overwritten.

## 25. Form data retention

- [ ] Phil-IRI form.
- [ ] Numeracy form.
- [ ] Literacy form.
- [ ] Teacher assignment form.
- [ ] Adviser assignment form.
- [ ] Grade encoding form.

## 26. Authorization bypass testing

- [ ] Direct URL access.
- [ ] Direct API/server action invocation.
- [ ] Browser refresh on restricted page.
- [ ] Opening a bookmarked restricted URL.
- [ ] Manipulating request parameters.
- [ ] Accessing another user's assignment.
- [ ] Accessing another section.
- [ ] Accessing another subject.
- [ ] Accessing another grade level.
- [ ] Authorization is enforced server-side.

## 27. UI/UX regression

- [ ] Broken layouts.
- [ ] Broken dropdowns.
- [ ] Broken buttons.
- [ ] Broken tabs.
- [ ] Incorrect labels (adviser/grade-encoding wording).
- [ ] Old Quarter terminology absent.
- [ ] Missing loading states.
- [ ] Missing empty states.
- [ ] Poor error messages.
- [ ] Text overflow.
- [ ] Table overflow.
- [ ] Mobile layout problems.
- [ ] Desktop layout problems.
- [ ] Console errors.

## 28. Responsive testing

- [ ] Desktop.
- [ ] Laptop.
- [ ] Tablet.
- [ ] Mobile.
- [ ] Assignment forms usable at each size.
- [ ] Teacher selectors usable at each size.
- [ ] Subject selectors usable at each size.
- [ ] Grading period selectors usable at each size.
- [ ] Grade tables usable at each size.
- [ ] Assessment forms usable at each size.
- [ ] Navigation usable at each size.
- [ ] No important control becomes inaccessible.

## 29. Error and console testing

- [ ] No unexpected JavaScript errors.
- [ ] No React errors.
- [ ] No hydration errors.
- [ ] No failed API requests.
- [ ] No unexpected 401 errors.
- [ ] No unexpected 403 errors.
- [ ] No unexpected 404 errors.
- [ ] No database errors exposed to the browser.
- [ ] No sensitive information logged.

## 30. Performance testing

- [ ] Student list loads normally.
- [ ] Assignment page loads normally.
- [ ] Grade Encoding loads normally.
- [ ] Assessment pages load normally.
- [ ] No unnecessary repeated API/database requests.
- [ ] No infinite loading states.
- [ ] No infinite render loops.
- [ ] No obvious N+1 query behavior introduced.

## 31. Automated checks

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm test`
- [ ] `npm run build`

## 32. Final database verification

- [ ] No unexpected test students remain.
- [ ] No unexpected test employees remain.
- [ ] No duplicate assignments remain.
- [ ] No duplicate grades remain.
- [ ] No invalid grading periods remain.
- [ ] No orphaned records were created.
- [ ] No unintended production data was changed.
- [ ] Controlled test data cleaned up and verified through Turso CLI.

## 33. Final regression (clean state)

- [ ] Registrar: login, Grade Encoding hidden, direct access blocked.
- [ ] Language & Literacy: login, view students, add/edit Phil-IRI, Numeracy, Literacy.
- [ ] Adviser + Subject Teacher: login, adviser access, subject recognized, grade encoding available, save/retrieve, unauthorized subject blocked.
- [ ] Admin: assign Adviser, assign Subject Teacher, assign both, assignments persist.
- [ ] Grading period: TERM 1, TERM 2, TERM 3, no Quarter 1–4.

---

## QA Summary

```text
Total Tests:
Passed:
Failed:
Blocked:
Fixed During QA:
```

## Database Verification

```text
Turso database checked:
Tables inspected:
Dummy data status:
Orphaned record status:
Assignment integrity:
Grading-period integrity:
```

## Authorization Verification

```text
Registrar restrictions:
Language & Literacy Coordinator permissions:
Adviser permissions:
Subject Teacher permissions:
Dual Adviser + Subject Teacher behavior:
Admin assignment permissions:
```

## Build Verification

```text
Lint:
Typecheck:
Build:
Tests:
```

## Remaining Issues

_To be completed during execution._
