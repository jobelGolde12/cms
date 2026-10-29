# System Diagrams — Records Management System

**Sta. Magdalena National High School — School-Only Platform (Phase 2 Migration)**  
**Source of truth: actual `src/db/schema.ts`, `src/lib/auth.ts`, `src/lib/permissions.ts`, `src/actions/*.ts`, `package.json`, migrations (`drizzle/*.sql`)**

---

## Diagram Files

| # | File | Title | Purpose |
|---|---|---|---|
| 01 | `system-architecture.md` | System Architecture Diagram | Technical architecture: client/server/database/external services; technology stack verification |
| 02 | `context-diagram.md` | Context Diagram (Level 0 DFD) | System boundary; 10 external actors (roles); major information flows; scope exclusions (no LGU/municipality) |
| 03 | `data-flow-diagram.md` | Data Flow Diagram (DFD) — Level 0 + Level 1 | 9 detailed processes (P1–P9); all data stores (D1–D5); labeled flows; grade workflow accuracy |
| 04 | `use-case-diagram.md` | Use Case Diagram (UML) | 10 actors with verified permissions; 80+ use cases mapped to `permissions.ts`; include/extend relationships |
| 05 | `erd.md` | Entity Relationship Diagram (ERD) | All 30+ tables; PK/FK/cardinality/indexes; relationships derived from `relations()` and migrations |
| 06 | `database-schema.md` | Database Schema Diagram (Physical) | Actual column definitions, data types, constraints, indexes; SQLite/Drizzle mapping; isolation rules |

---

## Design Principles (Applied Across All Diagrams)

- **No generic/theoretical content:** Every element verified against `src/db/schema.ts` or `src/lib/*.ts`.
- **No invented roles:** Only 10 roles from `constants.ts` / `permissions.ts` (`admin`, `school_admin`, `teacher`, `subject_teacher`, `records`, `guidance`, `nurse`, `registrar`, `literacy_coordinator`, `admin_officer`).
- **No invented database entities:** All tables from `sqliteTable()` definitions in schema file and SQL migrations.
- **No fake relationships:** All FKs, cardinalities, and `onDelete` behaviors taken directly from `references()` and SQL `FOREIGN KEY` clauses.
- **Grade workflow accuracy:** `draft` → `submitted` → `reopened` with `grade_submissions` ledger; `subject_teacher` only (`TEACHER_ONLY_WRITE`); adviser (`teacher`) has NO `grades.write`.
- **Adviser scope:** Only assigned sections (`sections.adviser_id` + `student_enrollments.status='active'`).
- **Admin Officer isolation:** Only `employees` / `employee_201_records` / `service_credit_transactions`; zero student FKs; no student permissions (`permissions.ts` line 253–266).
- **Nurse isolation:** Only `health_records` / `clinical_records`; `health.view` / `health.write`; NO `students.update` / `guardians.manage`.
- **Registrar strict read-only:** Only `documents.print` (preview-only), `reports.*`, `qr.verify`; NO `students.*` write permissions.
- **Audit trail:** Every mutation writes to `audit_logs`; append-only; `user_id` set null on user deletion.
- **Employee isolation:** Separate domain (`employees`, `employee_201_records`, `service_credit_transactions`) with no student FKs (`database-schema.md` confirms).

---

## Consistency Verification Summary

### Cross-Diagram Checks (Verified Manually)

| Check Point | System Arch | Context | DFD | Use Case | ERD | DB Schema | Status |
|---|---|---|---|---|---|---|---|
| 10 roles exist and mapped correctly | ✓ | ✓ | ✓ | ✓ | — | — | Confirmed |
| `admin` has full access (minus `grades.write` by design) | ✓ | ✓ | ✓ | ✓ (UC-01.10) | — | — | Confirmed |
| `subject_teacher` encodes grades | ✓ | ✓ (E4) | ✓ (P3) | ✓ (UC-04.6–UC-04.9) | ✓ (grade_submissions) | ✓ | Confirmed |
| `teacher` (Adviser) does NOT encode grades | ✓ | ✓ (E3) | ✓ (P3 input exclusion) | ✓ (UC-03.6 read-only) | ✓ (no grades.write FK) | ✓ | Confirmed |
| Grade submission lock (`submitted`) | ✓ | — | ✓ (P3.4, P3.5) | ✓ (UC-04.8 submit / UC-04.9 reopen) | ✓ (grade_submissions) | ✓ | Confirmed |
| `guidance` records behavior + interventions | ✓ | ✓ (E6) | ✓ (P5.1, P5.2) | ✓ (UC-06.7, UC-06.10) | ✓ (behavior_records, interventions) | ✓ | Confirmed |
| `nurse` records health only | ✓ | ✓ (E7) | ✓ (P6) | ✓ (UC-07.5, UC-07.6) | ✓ (health_records, clinical_records) | ✓ | Confirmed |
| `registrar` strictly read-only + print only | ✓ | ✓ (E8) | ✓ (P9.2) | ✓ (UC-08.7) | — | ✓ | Confirmed |
| `literacy_coordinator` handles assessments | ✓ | ✓ (E9) | ✓ (P5.4) | ✓ (UC-09.6–UC-09.8) | ✓ (assessments) | ✓ | Confirmed |
| `admin_officer` isolated from students | ✓ | ✓ (E10) | ✓ (P8 only D5) | ✓ (UC-10.x) | ✓ (no student FKs) | ✓ (separate domain) | Confirmed |
| `records` manages verification + duplicates | ✓ | ✓ (E5) | ✓ (P2.4, P2.5) | ✓ (UC-05.8, UC-05.9) | ✓ (record_verifications, duplicate_candidates) | ✓ | Confirmed |
| `audit_logs` append-only, `user_id` set null | ✓ | — | ✓ (P1.3) | — | ✓ (relations) | ✓ (ON DELETE SET NULL) | Confirmed |
| `service_credit_transactions` derived balance | ✓ | — | — | ✓ (UC-10.6 note) | ✓ (no balance column) | ✓ (derived query) | Confirmed |
| `employees` / `employee_201_records` / `service_credits` have zero student FKs | — | — | — | — | ✓ | ✓ (no references) | Confirmed |
| `behavior_records.confidential` server-side filter | — | — | ✓ (P5.1) | ✓ (UC-06.7) | ✓ (`confidential` column) | ✓ (boolean) | Confirmed |
| `section_subject_teachers` enforces grade scope | ✓ | ✓ (E4) | ✓ (P3.7) | ✓ (UC-04.3, UC-04.4, UC-04.5) | ✓ (table definition) | ✓ | Confirmed |
| `grade_submissions` ledger (`submitted` / `reopened`) | — | — | ✓ (P3.4, P3.5) | ✓ (UC-04.8, UC-04.9) | ✓ | ✓ (table definition) | Confirmed |
| `duplicate_candidates` pair-unique constraint | — | — | ✓ (P2.5) | ✓ (UC-05.9) | ✓ (UNIQUE index) | ✓ | Confirmed |
| `qr_verifications` token-unique, server validation | — | — | ✓ (P9) | ✓ (UC-08.8, UC-01.19) | ✓ (UNIQUE token) | ✓ | Confirmed |
| `reports` + `report_exports` metadata + format | — | — | ✓ (P7) | ✓ (UC-05.10, UC-08.6) | ✓ (relations) | ✓ | Confirmed |
| `forecasts` additive, invalidated on submission | ✓ | — | ✓ (P7.4) | — | ✓ (relations) | ✓ (table + indexes) | Confirmed |
| `notifications` user-linked (`ON DELETE CASCADE`) | — | — | — | — | ✓ | ✓ (FK with cascade) | Confirmed |
| All 30+ database tables represented in diagrams | — | — | ✓ (D1–D5) | — | ✓ (all entities) | ✓ (all tables listed) | Confirmed |

---

## Notes for Documentation / Defense

- **Technology stack verified:** `package.json` dependencies (Next.js 16.3.5, React 19.2.8, Drizzle ORM 0.45.2, `@libsql/client`, `recharts`, `@react-pdf/renderer`, `exceljs`, `qrcode`, `arima`, `zod`, `bcryptjs`) are all reflected in architecture and workflow descriptions.
- **Authentication pattern:** Server-side session (`sms_session` cookie, SHA-256 hash stored, `bcryptjs` password verification, `getCurrentUser()` server component guard) — no JWT; no client-side auth.
- **Migration status:** `drizzle/` contains 8 SQL migrations (`0000` to `0007`); schema matches current `src/db/schema.ts`; `database-schema.md` reflects all migrations.
- **Security rules applied:** `permissions.ts` RBAC enforced server-side; `scope.ts` row-level filters (`confidentialBehaviorFilter`, `sectionScope`, `teacherScope`, `adminOfficerScope`); audit logs for every mutation.
- **No invented features:** Every diagram element traces to a file (`*.ts`, `*.tsx`, `*.sql`, `*.md`) within the repository. Planned but unimplemented features are not shown.
