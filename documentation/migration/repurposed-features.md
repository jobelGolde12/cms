# Repurposed Features

> STATUS: **PLAN** — existing modules whose purpose changes.

| Module | Old purpose | New purpose | Key changes |
|---|---|---|---|
| Child registry (`/children`) | Census of children per barangay | Student registry (`/students`) | Entity rename + new filters (grade/section/enrollment); guardians; student numbers |
| Child profile (`/children/[id]`) | Census record detail | Student profile (tabbed IA per TODO §25) | Academic/attendance/assessment/behavior tabs; enrollment history |
| Validation workflow (`/validation`) | Barangay submits → LGU approves census records | Student record verification (`/verification`) | Checks become completeness/consistency; reviewers = records/school admin; same state machine pattern |
| Duplicate review (`/duplicates`) | Duplicate child detection | Duplicate student detection | Signals: student number, name, birth date, sex; workflow unchanged |
| Monitoring module (`/monitoring`) | OSY/ECCD/disability casework | Student development (`/development`) | Behavior + interventions; monitoring types removed |
| Interventions (`/monitoring/interventions`) | Child-level case management | Student support lifecycle (`/development/interventions`) | Statuses planned/active/completed/discontinued; outcome field |
| QR system (`/qr`, `/verify/*`) | Field verification of census records | Secure student identifier verification | Same token security; copy + scope changes |
| Dashboard (`/dashboard`) | Municipal demographics | School analytics | New KPIs/charts (enrollment, averages, attendance, proficiency, interventions) |
| Reports (`/reports`) | Municipal/barangay summaries | School report catalog | New types; school header; school-year filters |
| Settings (`/settings`) | Municipality config (`child_code_prefix` etc.) | School config | School profile; academic structure; grading scale; assessment levels; monitoring rules |
| Education status (`child_education`) | Field-collected census attribute | Enrollment history (`student_enrollments`) | Real per-year placement rows |
| Seed script | Municipality + barangays + children | School demo data | Sections, enrollments, grades, attendance, assessments — clearly fictional |
