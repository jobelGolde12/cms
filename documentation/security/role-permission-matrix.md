ROLE AND PERMISSION GUIDE FOR THE SCHOOL SYSTEM

Status: Implemented. Last audited November 3, 2026 (2026-11 revision: confined the Guidance Counselor to the Guidance Office domain, removed Reports from the Nurse, added the sections/employees configuration module and verified-records-only official printing — see features/rbac-2026-11-revision.md). Previous audit October 29, 2026 introduced the Subject Teacher role and moved grade encoding out of the Adviser role.

The ten roles described here are already live. They're defined in src/lib/permissions.ts and loaded through scripts/seed.mts and scripts/seed-remote-reference.mts. Every check is enforced on the server through requirePermission, getAuthorizedUser, and the row-level scope in src/lib/scope.ts. Checks in the user interface are only for appearance and don't protect anything on their own.


THE TEN ROLES

admin (System Administrator)
Handles user management, roles and permissions, system configuration, audit logs, and technical administration.

school_admin (School Administrator)
Looks after school-wide student records, academic monitoring, enrollment, analytics, and reports.

subject_teacher (Subject Teacher)
Encodes student grades AND NOTHING ELSE: only for the exact (section, subject) teaching loads in the section_subject_teachers table. Cannot edit student personal information, record attendance or behavior, manage users, or touch administrative settings. Row-level scope follows the same teaching-load table.

teacher (Adviser)
Works with the students in their own assigned sections: attendance, assessments, and behavior notes. The Adviser does NOT encode grades (moved to subject_teacher in the 2026-10 revision) — grades are view-only for the Adviser.

records (Records Personnel)
Handles student records, enrollment, profile verification, historical records, and documents.

guidance (Guidance Counselor)
Works exclusively out of the Guidance Office (/guidance): student lookup plus confidential behavioral incident records. Incidents recorded through the Guidance Office are confidential by default. The Student Development module, grades, attendance, assessments, interventions and reports are all outside this role's scope (2026-11 revision).

nurse (Nurse)
Works with health, nutrition, and clinical records only. A nurse cannot edit general student information and has no access to Reports (2026-11 revision).

registrar (Registrar)
Strictly read-only access, plus printing of official documents such as the student card and Form 137.

literacy_coordinator (Language and Literacy Coordinator)
Handles reading, literacy, and numeracy assessments and their statistics.

admin_officer (Admin Officer)
Handles employee records only (201 files and service credits). This role is kept completely separate from student data.

The barangay and lgu roles have been removed, since the municipality-level scope no longer exists.


ACCOUNT PROVISIONING

Running the seed script never invents credentials. An account is created only when BOTH of the following environment variables are set for that role:

    DEFAULT_<ROLE>_EMAIL
    DEFAULT_<ROLE>_PASSWORD_HASH

If either one is missing, that role is skipped and reported on the console. There is no shared fallback password and no `*@local.dev` fallback address, so a seed run can never resurrect a demo login.

Environment variables per role (each role has an e-mail, a password hash, a first name, and a last name):

admin: DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD_HASH, DEFAULT_ADMIN_FIRST_NAME, DEFAULT_ADMIN_LAST_NAME
school_admin: DEFAULT_SCHOOL_ADMIN_EMAIL, DEFAULT_SCHOOL_ADMIN_PASSWORD_HASH, and so on
teacher: DEFAULT_TEACHER_EMAIL, DEFAULT_TEACHER_PASSWORD_HASH, and so on
subject_teacher: DEFAULT_SUBJECT_TEACHER_EMAIL, DEFAULT_SUBJECT_TEACHER_PASSWORD_HASH, and so on
records: DEFAULT_RECORDS_EMAIL, DEFAULT_RECORDS_PASSWORD_HASH, and so on
guidance: DEFAULT_GUIDANCE_EMAIL, DEFAULT_GUIDANCE_PASSWORD_HASH, and so on
nurse: DEFAULT_NURSE_EMAIL, DEFAULT_NURSE_PASSWORD_HASH, and so on
registrar: DEFAULT_REGISTRAR_EMAIL, DEFAULT_REGISTRAR_PASSWORD_HASH, and so on
literacy_coordinator: DEFAULT_LITERACY_EMAIL, DEFAULT_LITERACY_PASSWORD_HASH, and so on
admin_officer: DEFAULT_ADMIN_OFFICER_EMAIL, DEFAULT_ADMIN_OFFICER_PASSWORD_HASH, and so on

Two things to keep in mind. First, the password hash variables hold a hash, not the password itself, so if you've set one in .env, the real password can't be read from this file. Second, these accounts are created for whatever database the seed is pointed at — provision real personnel accounts from the User Management screen (System Administrator → /users → New Account), which hashes the password server-side and writes an audit entry.

RETIRED DEMO ACCOUNTS

The demo/test accounts removed on November 5, 2026 are on a deny-list inside both seed scripts (RETIRED_DEMO_EMAILS in scripts/seed.mts and scripts/seed-remote-reference.mts), together with the whole `*@local.dev` domain. The seeds refuse to provision those addresses even if an environment variable still points at one, so they cannot come back through a seed run.


WHO CAN SEE WHICH STUDENTS

Most roles can reach every student record: admin, school_admin, records, guidance, nurse, registrar, and literacy_coordinator. What they can actually do with those records is controlled by permissions, not by limiting which rows they see.

Advisers see only students with an active enrollment in a section where they are the adviser. This is checked through sections.adviser_id and student_enrollments.status = 'active'.

Subject Teachers see only students with an active enrollment in a section that holds one of their section_subject_teachers teaching loads.

The admin_officer sees no student rows at all. The rule is written so it can never be true for student data, so even a direct call can't reach a student.


SENSITIVE DATA RULES

Guidance confidentiality
Behavior records marked confidential = true (written by the Guidance Office) can be read or changed only by admin, school_admin, and guidance. This is enforced in every behavior query, dashboard, report export, and in the saveBehavior and list guards (see confidentialBehaviorFilter in src/lib/scope.ts). It is never just a UI rule.

Health data
The health_records and clinical_records tables both require the health.view permission, and only admin and nurse have it. The 2026-10 audit settled a conflict here: the matrix note won out over an older per-role table row that had given School Administrators view access.

Registrar
The registrar has no write permission on any student data. The only action that looks like a write is the documents.print pages, which show a preview and open the browser's print dialog without changing anything.


WHAT EACH ROLE CAN DO

Every role can see the dashboard (dashboard.view).

ADMIN
Full access to everything, including:
- User management (users.*), the account list (users.view), and settings (settings.manage)
- Audit logs
- Health, nutrition, and clinical records
- Employee records, 201 files, and service credits
- All student, academic, behavior, assessment, intervention, report, document, and QR functions

SCHOOL ADMIN
Full access to student and academic work, but not health data, user management, or employee records.
- Student registry: view, create (drafts), update, archive
- Full student profile and guardians
- Enrollment: create, update, view
- Subjects and grading period setup (academics.config)
- Grades and attendance: write and view
- Behavior: write and view, including confidential guidance records
- Assessments and interventions: write and view
- Record verification and duplicate review
- Reports: view, generate, export
- Official document printing and QR generate/verify
- Audit logs
- Settings: limited to academic configuration

SUBJECT TEACHER
Granting a teaching load (a section_subject_teachers row: section + subject) is how a Subject Teacher's scope is defined. Requires admin action — `academics.config` — from **Teacher Assignments** (`/assignments`), where an administrator picks a section, a subject and an active teacher account. The same loads can also be managed from the Employee form (position "Subject Teacher" or "Adviser + Subject Teacher" with a linked login account). Assigning a load grants the Subject Teacher role automatically, so the permission gate and the assignment never disagree.
- View students with an active enrollment in sections holding their teaching loads
- Encode and edit grades ONLY for their (section, subject) pairs — enforced by getGradeWriter + canWriteGradesInSection on every action call, with a unique per-(enrollment, subject, period) index preventing duplicates
- Grade draft → submit → reopen workflow where the submission ledger locks sheets
- Subject teacher grades are recorded with their own user id (recordedBy) for the audit trail
- View and generate reports for their own sections (no exporting)
- Cannot edit student personal information, record attendance, behavior, or assessments, manage users, or touch settings

TEACHER (ADVISER)
Everything below applies to the adviser's own assigned sections only.
- View students, enrollment, and full profiles
- View guardians of assigned students
- View grades (read-only — the Adviser role alone never encodes grades; encoding is the Subject Teacher's role)
- **Adviser + Subject Teacher:** one account may hold both roles. The adviser assignment (`sections.adviser_id`) and the (section, subject) teaching load are independent, so the same teacher keeps the advisory scope below AND can encode grades for their assigned subjects. The effective permission set is the union of both roles (`hasUserPermission`); no duplicate account is needed.
- Record and view attendance
- Record behavior notes and view behavior records
- Record and view assessments
- View interventions
- View and generate reports for their own sections (no exporting)

RECORDS
- Student registry: view, create, update, archive
- Full student profile and guardians
- Enrollment: create, update, view
- Read-only view of grades, attendance, and assessments
- Record verification and duplicate review
- Reports: read-only viewing, plus export
- Official document printing and QR generate/verify

GUIDANCE (GUIDANCE COUNSELOR — 2026-11 REVISION)
- Read-only view of the student registry, with a limited profile covering support-related areas
- Search students and record incidents (student + section picked from existing records, never typed)
- Incident types are data rows (behavior categories, kind = 'concern') — nothing is hard-coded; new types can be added by seeding, no code change
- Record incident, type, severity, and status; edit where appropriate (audit-logged)
- Review a student's incident history (Guidance incident roster + per-student views)
- View guardians and enrollment
- Behavior: write and view, including confidential guidance records
- Hold NO academic or reporting modules: grades, attendance, assessments, interventions, reports, official document printing and the Student Development module (/development) are all excluded
- Cannot modify student personal information or manage users

NURSE
- View the student registry, enrollment, and guardians
- Student profile: health information only
- Health and nutrition records: record and view
- Clinical records: record and view
- NO Reports access: reports.view / reports.generate / reports.export and documents.print were withdrawn in the 2026-11 revision

REGISTRAR
- View the student registry, enrollment, and guardians
- Read-only profile, grades, attendance, and assessments
- Reports: view, generate, and export
- Official document printing (student card, Form 137)
- No write access to any student data

LITERACY COORDINATOR
- View the student registry, enrollment, and guardians
- Student profile: assessments only
- Reading, literacy, and numeracy assessments: record and view
- Interventions: view
- Reports: view and generate

ADMIN OFFICER
- Employee records (employees.*)
- PERA and 201 files (employee_201.*)
- Service credits (service_credits.*)
- Reports: view and generate
- Audit logs: view
- No access to student data of any kind


DOCUMENTATION RULES

Every permission key listed here is an entry in PERMISSIONS inside src/lib/permissions.ts. Each one also has a seeded row in the permissions and role_permissions tables, using the existing seeding process.

If any rule changes in the future, this file and the code map need to be updated together.

GRADE ENCODING (2026-10 REVISION B)
grades.write is held ONLY by the subject_teacher role. Admin, school_admin, and every other role are deliberately excluded (see TEACHER_ONLY_WRITE in src/lib/permissions.ts). On top of the role check, every grade action re-establishes the assignment check server-side: the caller must hold a section_subject_teachers row for the exact (section, subject) pair being written. Attempting to tamper with section/subject/period ids in a request payload fails the row-level check even when the role passes.

The "Requires Attention" indicators follow the neutral terminology rule. They're visible to the same people who can see the underlying data.


WHAT "201" MEANS IN EMPLOYEE RECORDS
The "201 file" is an employee's personnel record — a per-employee log of official documents (appointments, eligibility, training, performance, leave, certificates, and so on), separate from the core employee profile and from service credits. It lives in the employee_201_records table and is reachable at /employees/[id]/201. Each entry has a category, title, description, record date, and an optional file reference to stored documentation. Entries can be archived (soft-deleted) but never physically removed, so the personnel history is preserved. Access requires employee_201.view to read and employee_201.manage to create, edit, or archive entries.

