# Teacher Assignment Model — 2026-11 (revision C)

> **Implementation record**, not a plan. Implemented, type-checked, linted,
> built and covered by the unit-test suite. Amends
> `documentation/security/role-permission-matrix.md` and
> `documentation/features/rbac-2026-11-revision.md` where the two disagree.

---

## 1. The problem revision C solves

The 2026-10 revision moved grade encoding from the **Adviser** role to the
**Subject Teacher** role. That worked for the simple case, but it created three
real problems in a small school:

1. **One teacher, two jobs.** A teacher who is the adviser of a section and also
   teaches a subject had to be represented twice — as an adviser and as a
   subject teacher — or the school had to pick one and lose the other.
2. **Role-based encoding was too coarse.** `role === "subject_teacher"` said
   *what* someone is, not *what they may write*. A subject teacher assigned to
   Grade 7 Filipino could still be trusted to write Grade 9 Science without a
   second check.
3. **The Registrar could reach the grade sheet.** `grades.view` was enough to
   render the `/grades` module, so a read-only official-records role was one
   click away from the encoding screen.

Revision C replaces the role check with an **assignment** check, introduces a
separate **module gate**, and lets one account hold **several roles**.

---

## 2. The three layers

| Layer | Question it answers | Mechanism |
|---|---|---|
| Module gate | *May this person open the Grade Encoding screen at all?* | `grades.encode` permission |
| Write permission | *May this person write a grade value?* | `grades.write` permission |
| Row scope | *Whose grade, in which subject and section?* | `section_subject_teachers` assignment row |

All three are evaluated server-side. The navigation link is a convenience, not
the control.

### 2.1 Module gate — `grades.encode`

A new permission separates *opening the module* from *reading grades*:

```ts
// src/lib/permissions.ts
"grades.view",   // read a student's grades (profile, performance, report cards)
"grades.write",  // write a grade value (Subject Teacher role only)
"grades.encode", // open the /grades grade-sheet module
```

| Role | `grades.view` | `grades.write` | `grades.encode` |
|---|---|---|---|
| admin | ✓ | — | ✓ |
| school_admin | ✓ | — | ✓ |
| records | ✓ | — | ✓ |
| subject_teacher | ✓ | ✓ | ✓ |
| teacher (Adviser) | ✓ | — | — |
| registrar | ✓ | — | — |
| guidance / nurse / literacy_coordinator / admin_officer | — | — | — |

* The **Registrar deliberately holds neither** `grades.encode` nor
  `grades.write`: the module is absent from the sidebar **and** `/grades`
  redirects server-side. The Registrar keeps `grades.view` for read-only
  academic context and `documents.print` for the Student Card and Form 137.
* `grades.write` stays exclusive to the Subject Teacher role
  (`TEACHER_ONLY_WRITE` in `src/lib/permissions.ts`) — Admin and School Admin
  may *supervise* the academic module but never write a grade themselves.

### 2.2 Write scope — assignment, not role

`src/lib/grades.ts`:

```ts
export async function getGradeWriter(): Promise<GradeWriter | null> {
  const user = await getAuthorizedUser("grades.write");   // permission gate
  return user;
}

export async function canWriteGradesInSection(
  user: SessionUser,
  sectionId: string,
  subjectId?: string,
): Promise<boolean> {
  if (!hasUserPermission(user.roles, "grades.write")) return false;
  const assignments = await teacherSubjectAssignments(user.id);
  if (subjectId) {
    return assignments.some((a) => a.sectionId === sectionId && a.subjectId === subjectId);
  }
  return assignments.some((a) => a.sectionId === sectionId);
}
```

Consequences:

* Being the section's **adviser is not sufficient** to encode.
* Holding the **subject-teacher role is not sufficient** to encode — the
  matching `section_subject_teachers` row is required.
* Tampering with the section/subject/period ids in a request payload fails the
  row-level check even when the permission passes.
* `groupAssignmentsBySection()` groups **only** the teaching loads. A section
  the user merely advises no longer grants "all subjects".

### 2.3 Multi-role accounts — the union

`users.role_id` remains the **primary** role. The new table `user_roles`
carries the **additional** roles:

```sql
CREATE TABLE user_roles (
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id   TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, role_id)
);
```

`SessionUser` now carries both:

```ts
export type SessionUser = {
  …
  role: Role;    // primary role
  roles: Role[]; // EVERY role the account holds (primary first)
};
```

The effective permission set is the **union** over those roles:

```ts
export function hasUserPermission(roles: readonly Role[] | undefined, permission: Permission): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission) ?? false);
}
```

So an account whose primary role is **Adviser** and which additionally holds
**Subject Teacher**:

* keeps the advisory permissions (attendance, behavior, assessments, …),
* gains `grades.write` **and** `grades.encode` from the Subject Teacher role,
* is still limited to its own teaching loads by the row-level check.

No second employee record, no second login, no duplicated personal data.

`src/lib/scope.ts` was rewritten the same way: `studentScope()`,
`userSectionScope()` and `canAccessStudent()` union the advisory sections with
the subject-teacher sections, so a dual-role teacher sees exactly the union of
both domains.

---

## 3. `/assignments` — the administrator screen

Route: `src/app/(app)/assignments/page.tsx` — permission `academics.config`
(admin + school admin), checked with `hasUserPermission(user.roles, …)`.

**Filters** (plain GET parameters, shareable, no JavaScript required):

| Parameter | Meaning |
|---|---|
| `sy` | School year |
| `gl` | Grade level — narrows the whole screen (forms + table) |

**Two forms, one table** — the two assignment types are separate forms because
they are separate facts:

| Form | Fields | Server action |
|---|---|---|
| **Assign an adviser** | Grade level → Section → Teacher | `assignAdviser` |
| **Assign a subject teacher** | Grade level → Section → Subject → Teacher | `assignSubjectTeacher` |

Each form header carries an explicit *Assignment type* badge, and the unified
table below lists both kinds of assignment with a per-row **Remove** control
(`clearAdviser`, `removeSubjectTeacher`).

### 3.1 Rules the server enforces

`src/actions/assignments.ts` re-checks every rule; the client is only a
convenience.

| Rule | Behaviour |
|---|---|
| Permission | `academics.config` — otherwise the action fails |
| Active entities | section, subject and teacher account must all be active |
| Teaching role | the account must hold a teaching role before it can be assigned |
| **No silent overwrite** | an existing adviser or an existing (section, subject) load is **never** replaced silently — the admin must **remove first** and then assign |
| Role grant | assigning an adviser grants `role-teacher`; assigning a load grants `role-subject-teacher` (`ensureUserRole`) — the assignment, the permission gate and `user_roles` never disagree |
| Audit | every assignment and removal is written to the audit log |

The "remove-first" rule lives in pure, unit-tested helpers:

`src/lib/assignment-rules.ts` → `checkAdviserChange()`, `checkSubjectTeacherChange()`.

### 3.2 Keeping the employee record in step

An adviser assignment updates `sections.adviser_id` **and** the linked
employee's `assigned_section_id` in the same transaction, so the Section
Management screen and the Employee screen can never disagree about who advises
which section.

---

## 4. Where the checks live

| Concern | Location | Union-aware? |
|---|---|---|
| Navigation entry | `src/components/app-shell.tsx` | ✓ `hasUserPermission` |
| `/grades` route guard | `src/app/(app)/grades/page.tsx` | ✓ `hasUserPermission` |
| Grade sheet resolution | `src/lib/grades.ts` → `resolveGradeSliceContext()` | ✓ |
| Grade write actions | `src/actions/grades.ts` → `getGradeWriter()` + `canWriteGradesInSection()` | ✓ |
| Assignment actions | `src/actions/assignments.ts` | ✓ |
| `/assignments` route | `src/app/(app)/assignments/page.tsx` | ✓ |
| Every other page/action | `requirePermission()` / `getAuthorizedUser()` / `hasUserPermission(user.roles, …)` | ✓ |

**All 59 page-, component- and action-level `hasPermission(user.role, …)` call
sites were converted to `hasUserPermission(user.roles, …)`** so the UI and the
backend resolve the same permission set. `src/proxy.ts` (the optimistic
middleware gate) now loads the additional roles too, so a dual-role account is
not rejected before the handler-level check runs.

---

## 5. Tests

| File | Covers |
|---|---|
| `src/lib/__tests__/rbac-roles.test.ts` | the matrix — including that the Registrar holds **no** `grades.encode`/`grades.write` and that a plain Adviser holds no `grades.write` |
| `src/lib/__tests__/assignments.test.ts` | the union: an Adviser + Subject Teacher account resolves `grades.write`; the pure assignment rules (no silent overwrite) |
| `src/lib/__tests__/grade-scope.test.ts` | `groupAssignmentsBySection()` — advisory sections grant **no** subject |
| `src/lib/__tests__/scope.test.ts` | the union of advisory and subject-teacher sections in `studentScope()` |

---

## 6. Operational notes for the school

1. Open **Teacher Assignments** (School Admin or Administrator).
2. Create the sections first (**Sections → New Section**) — the assignment
   screen lists only existing sections.
3. Assign the **adviser** of each section.
4. Assign each **subject load**: section + subject + teacher. Repeat for every
   subject the teacher carries in that section.
5. The same account may appear in both lists — that is the intended
   Adviser + Subject Teacher setup, not a duplicate.
6. Removing an assignment revokes the grade-encoding scope immediately. Grades
   already encoded are kept for the record.
