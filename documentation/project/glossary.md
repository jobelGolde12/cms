# Glossary — Records Management System with Profile and Performance Analytics of Sta. Magdalena National High School

> Canonical terminology for the new system. Old terms are listed for traceability.

## New Terms

| Term | Definition |
|---|---|
| **Student** | An enrolled (or historically enrolled) learner of Sta. Magdalena National High School. Central entity of the system. Replaces "child". |
| **Student Number** | Application-generated stable public identifier, e.g. `SM-2026-000001` (pattern from the old `child_code`, prefix configurable in system settings). |
| **Guardian** | Parent or legal guardian recorded against a student. Sensitive data — access-controlled. |
| **School Year** | Academic year, stored as `YYYY-YYYY` (e.g. `2026-2027`). Replaces the loose `school_year` text field. |
| **Grade Level** | Secondary-level level (Grade 7 … Grade 10 for JHS; 11–12 for SHS if configured). Replaces the old elementary K–6 list. |
| **Section** | A class grouping within a grade level for a school year (e.g. "Grade 7 — Sampaguita"). Replaces barangay as the operational grouping. |
| **Enrollment** | A student's placement: student → school year → grade level → section. Historical rows are never overwritten. |
| **Subject** | A defined course (e.g. Mathematics, Filipino) used for grade records. |
| **Grading Period** | A subdivision of a school year (default: Quarter 1–4, configurable). |
| **Grade Record** | A student's grade for one subject in one grading period of one school year. |
| **General Average** | Server-computed mean of a student's subject grades for a period/school year. |
| **Attendance Record** | One student's status for one school day: present, absent (excused/unexcused), late. |
| **Behavior Record** | A categorized observation (positive or concern) about a student, permission-controlled, neutral language. |
| **Assessment (Reading / Literacy / Numeracy)** | A recorded evaluation with date, type, level/proficiency, optional score, assessor, notes. Categories and levels are configurable. |
| **Intervention** | Structured support action for a student: planned → active → completed → discontinued, with outcome and follow-ups. |
| **Requires Attention / Needs Monitoring** | Neutral indicator flags produced by **documented, configurable** rules. Not a diagnosis; never stigmatizing labels. |
| **Verification (record)** | Data-quality review of a student record: completeness, consistency, duplicates. Replaces the child validation workflow. |
| **Audit Trail** | Append-only log of sensitive operations (actor, action, entity, timestamp, metadata). |

## Old → New Terminology Map

| Old term | Status | New term / disposition |
|---|---|---|
| child / children | ❌ rename | **student / students** (DB tables renamed via migration, not blind global rename) |
| child code | ❌ rename | **student number** |
| Child Mapping | ❌ remove | System title; replaced by the official title |
| municipality / municipal | ❌ remove | **school** context (Sta. Magdalena National High School) |
| barangay | ❌ remove | **section / grade level** (operational grouping) |
| LGU / LGU User | ❌ remove | role redefined (School Administrator, etc.) |
| Barangay User | ❌ remove | roles redefined — see role-permission matrix |
| household / sitio | ❌ remove | guardian contact info retained; household survey data dropped |
| out-of-school youth (OSY) | ❌ remove | not applicable inside a school system |
| ECCD | ❌ remove | early-childhood program tracking is out of scope for an NHS |
| education status (child-level) | ❌ replace | **enrollment history** (real enrollment rows) |
| validation (child record) | ♻️ repurpose | **student record verification** |
| duplicate candidate | ✅ retain | same concept, student fields |
| intervention / follow-up | ✅ retain | same concept, student-scoped |
| monitoring | ♻️ repurpose | **student development / needs monitoring** |
| mapping ID | ❌ remove | student number |
| humiracy | ⚠️ investigate | interpreted as **numeracy** — see `features/numeracy.md`; confirm with school |
