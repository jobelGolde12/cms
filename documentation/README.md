# Documentation — Records Management System with Profile and Performance Analytics of Sta. Magdalena National High School

> All documents are currently **PLAN-state** (planning mode per TODO.md).
> Nothing in `src/` has been changed by the migration yet.

## Executive Summary

The repository currently implements the **Municipal Child Mapping System** — a
municipality-wide child census platform (Next.js 16 App Router, Turso/libSQL +
Drizzle, server-side RBAC, PDF/XLSX reports, QR verification) for the LGU of
Sta. Magdalena, Sorsogon. It must become the **Records Management System with
Profile and Performance Analytics of Sta. Magdalena National High School** — an
internal, school-only platform centered on **students**: enrollment history,
grades, attendance, behavior, reading/literacy/numeracy assessments,
interventions, analytics, and school reports.

**Audit verdict (Phase 1):** the architecture, design system, auth, RBAC
skeleton, audit/QR/report pipelines, and state-management conventions are sound
and are **retained**; the domain (children→students, barangays→sections),
data model (15 new/transformed tables, 11 archived), roles (5 school roles
replace barangay/LGU/admin-only), navigation, and every analytics surface are
**rebuilt**. Design preservation is a hard constraint.

**Migration strategy:** append → backfill → cutover → archive (no destructive
drops before verified cutover; rollback via snapshots + archived tables).
Execution is tracked by the 24-phase, 133-task checkbox roadmap in
`migration/master-migration-plan.md`.

## Tree

```
documentation/
├── README.md                     ← you are here
├── project/
│   ├── project-overview.md       Identity, objectives, conceptual model, constraints
│   ├── system-scope.md           In/out of scope; removed, retained, repurposed
│   ├── requirements.md           Functional + non-functional requirements
│   └── glossary.md               Canonical terms + old→new map
├── migration/
│   ├── master-migration-plan.md  ★ AUTHORITATIVE 24-phase checkbox roadmap
│   ├── codebase-audit.md         Phase 1 audit (architecture, routes, terms, auth, DB)
│   ├── scope-change.md           Municipality → school rationale & consequences
│   ├── old-vs-new.md             Side-by-side comparison tables
│   ├── removed-features.md
│   ├── retained-features.md
│   ├── repurposed-features.md
│   ├── migration-risks.md        Program-level risk register
│   └── rollback-plan.md
├── database/
│   ├── database-overview.md      Principles + table groups
│   ├── schema-design.md          Full target schema (columns, keys, indexes)
│   ├── data-dictionary.md        Vocabularies, formats, settings keys, audit verbs
│   ├── relationships.md          Every relationship (cardinality, FK, cascade)
│   ├── indexing.md               Index strategy tied to queries
│   ├── constraints.md            DB + application constraints
│   ├── migration.md              Append → backfill → cutover → archive plan
│   ├── migration-risks.md        DB risk register
│   ├── SCHEMA.md / ERD.md        (existing, describes OLD schema — to be replaced in Phase 5)
│   └── README.md                 (existing, old — rewrite in Phase 23)
├── features/
│   ├── students.md  enrollment.md  academic.md  attendance.md
│   ├── behavior.md  reading.md  literacy.md  numeracy.md
│   ├── interventions.md  analytics.md  reports.md
│   ├── qr-verification.md  verification.md
├── security/
│   ├── authentication.md
│   ├── authorization.md
│   ├── role-permission-matrix.md ★ 5 school roles
│   ├── privacy.md
│   └── audit-logging.md
├── ui/
│   ├── page-migration.md         Route-by-route migration + navigation + components
│   └── ux-guidelines.md          Design preservation + a11y/responsive standards
└── testing/
    ├── test-plan.md              Unit/authorization/analytics/report coverage
    └── acceptance-tests.md       Manual per-role QA journeys
```

## Reading order for an implementing agent

1. `project/project-overview.md` + `project/system-scope.md`
2. `migration/codebase-audit.md`
3. `security/role-permission-matrix.md`
4. `database/schema-design.md` + `database/relationships.md`
5. `migration/master-migration-plan.md` — then execute phase by phase,
   ticking checkboxes only for completed work.
