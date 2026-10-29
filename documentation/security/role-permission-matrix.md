ROLE AND PERMISSION GUIDE FOR THE SCHOOL SYSTEM

Status: Implemented. Last audited October 29, 2026 (introduced the Subject Teacher role; moved grade encoding out of the Adviser role).

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
Records and manages student behavioral/disciplinary incidents (the Guidance Office workflow at /guidance) — incident type, intervention, status — plus behavior records, interventions, and support information. Incidents recorded through the Guidance Office are confidential by default. Also selected student development data.

nurse (Nurse)
Works with health, nutrition, and clinical records only. A nurse cannot edit general student information.

registrar (Registrar)
Strictly read-only access, plus printing of official documents such as the student card and Form 137.

literacy_coordinator (Language and Literacy Coordinator)
Handles reading, literacy, and numeracy assessments and their statistics.

admin_officer (Admin Officer)
Handles employee records only (201 files and service credits). This role is kept completely separate from student data.

The barangay and lgu roles have been removed, since the municipality-level scope no longer exists.


DEFAULT SEED ACCOUNTS

Running the seed script creates one demo account per role. The email and password come from your .env file if the DEFAULT_* values are set. If they aren't, the script falls back to the values below.

Role                  Default email                  Default password   Display name
admin                 admin@local.dev                password123        Admin Demo
school_admin          school_admin@local.dev         password123        SchoolAdmin Demo
teacher               teacher@local.dev              password123        Adviser Demo
subject_teacher       subject_teacher@local.dev      password123        SubjectTeacher Demo
records               records@local.dev              password123        Records Demo
guidance              guidance@local.dev             password123        Counselor Demo
nurse                 nurse@local.dev                password123        Nurse Demo
registrar             registrar@local.dev            password123        Registrar Demo
literacy_coordinator  literacy_coordinator@local.dev password123        LiteracyCoord Demo
admin_officer         admin_officer@local.dev        password123        AdminOfficer Demo

Environment variables that override these defaults (each role has an email, a password hash, a first name, and a last name):

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

Two things to keep in mind. First, the password hash variables hold a hash, not the password itself, so if you've set one in .env, the real password can't be read from this file. Second, these are development accounts only. Change or remove them before the system holds any real student or employee data.


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
- Student registry: view, create, update, archive
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
Granting a teaching load (a section_subject_teachers row: section + subject) is how a Subject Teacher's scope is defined. Requires admin action — academics.config; an admin UI for managing assignments is a documented follow-up.
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
- View grades (read-only — the Adviser never encodes grades; encoding is the Subject Teacher's role)
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

GUIDANCE (GUIDANCE COUNSELOR)
- Read-only view of the student registry, with a limited profile covering support-related areas
- Search students and record incidents (student + section picked from existing records, never typed)
- Incident types are data rows (behavior categories, kind = 'concern') — nothing is hard-coded; new types can be added by seeding, no code change
- Record incident, intervention, type, severity, and status; edit where appropriate (audit-logged)
- Review a student's incident history (Guidance incident roster + per-student views)
- View guardians and enrollment
- Grades: summary view only — never encodes grades
- Attendance: view
- Behavior: write and view, including confidential guidance records
- Assessments and interventions: write and view
- Reports: limited
- Cannot modify student personal information or manage users

NURSE
- View the student registry, enrollment, and guardians
- Student profile: health information only
- Health and nutrition records: record and view
- Clinical records: record and view
- Reports: view and generate, health-related only

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

