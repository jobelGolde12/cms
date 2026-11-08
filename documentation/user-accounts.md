# User Accounts and Password Hashes

> **⚠️ SECURITY NOTICE**: This document contains bcrypt password hashes from the Turso database. These are **NOT plaintext passwords** — they are cryptographic hashes that cannot be reversed. This document is intended for testing and documentation purposes only. Never share plaintext passwords.

## Overview

All user accounts in the system store passwords as bcrypt hashes (cost factor 10). The hashes are stored in the `users` table with the following schema:
- `password_hash`: bcrypt hash (format: `$2b$10$...`)

## Production User Accounts

| User ID | Role | Email | Password Hash |
|---------|------|-------|---------------|
| `user-admin` | System Administrator | admin@gmail.com | `$2b$10$YdPHVnsgyq/xnRXb8Nva3OyqRyL9cvQ1.nx.k1kl2X29zU4vvYbbK` |
| `f62a274e-b62b-4012-902a-16bdfe0e857a` | School Administrator | school.admin@deped.gov.ph | `$2b$10$/QsWfKjZJykqTA5hpjC9weIcddcVbqhj7UD3wuAURLOVkWOOtJfVi` |
| `389b9e47-78fc-4512-b9c5-5889b1c8fab6` | Adviser | norbert.gojar@deped.gov.ph | `$2b$10$y8.0BY.2iObjo9yW1bppIeI1LO/vxBCU0MTBCd0n398z9lf8GHc1S` |
| `ec00b804-7db2-407a-a75b-be3ac0a18007` | Subject Teacher | meisher.alcaraz@deped.gov.ph | `$2b$10$3gIdKZDEpXyb6Kdlk8fDnendqM8X.DDSm6ijCWhZE9f05Z4gR0cwO` |
| `73fe65fa-0fd4-4c9c-a08a-645a52716c4c` | Admin Officer | narissa.bayting@deped.gov.ph | `$2b$10$CcUlQA4R3WriMtdPDCbPJOBgLZ.iy9i7kq1YOzT6CjizGVDJ9602q` |
| `0b29f169-2bf2-4afb-8ffa-40114ca75559` | Registrar | amelia.figueroa@deped.gov.ph | `$2b$10$kuWMmSERkm9//iHDcDceSujGh221htv8LKq.PFtYSEWIn.h9gqQvC` |
| `807b5193-f358-4059-8d5e-a35f34a3e345` | Guidance Counselor | christopher.bacunawa@deped.gov.ph | `$2b$10$djLUzyO20UB7PFbRyguxz.KIvY5k6DEvv1aJDkSe879YhygNPlv.K` |
| `887b0a39-0659-4767-9f1f-ba74a3061c2b` | Nurse | anafe.maravilla@deped.gov.ph | `$2b$10$0jcGdVd0KtgNj5kbwAO2VuKe.rcSg7XSoXFmYnVmxHIKIRT/646f.` |
| `1543d1f7-0506-473c-9f4e-0a0496b6c792` | Adviser | hannafae.forte@deped.gov.ph | `$2b$10$i4YgzYW.BUS/ZFbBJ2YGhuHcKRtVXkIIwzWcDeh6WyxxEoQqX2cya` |
| `ca9937b2-f1a3-462c-9f4a-a9d4f23aa860` | Language & Literacy Coordinator | catherine.bartolata@deped.gov.ph | `$2b$10$YkrcawdmnaCxyNaoJKgsLubd0Tx4mlSrVxrr7Iwzj28yAiMfmEA4S` |

## QA / Test User Accounts

| User ID | Role | Email | Password Hash |
|---------|------|-------|---------------|
| `qa-user-admin` | System Administrator | qa-user-admin@qa.local | `$2b$10$XWw/KiYHTohJqTrN.ADBcuSxXW6kCFXsYAr6PBj/sAEhiQ.17/wt2` |
| `qa-user-registrar` | Registrar | qa-user-registrar@qa.local | `$2b$10$XWw/KiYHTohJqTrN.ADBcuSxXW6kCFXsYAr6PBj/sAEhiQ.17/wt2` |
| `qa-user-literacy` | Language & Literacy Coordinator | qa-user-literacy@qa.local | `$2b$10$XWw/KiYHTohJqTrN.ADBcuSxXW6kCFXsYAr6PBj/sAEhiQ.17/wt2` |
| `qa-user-dual` | Adviser | qa-user-dual@qa.local | `$2b$10$XWw/KiYHTohJqTrN.ADBcuSxXW6kCFXsYAr6PBj/sAEhiQ.17/wt2` |
| `qa-user-adviser` | Adviser | qa-user-adviser@qa.local | `$2b$10$XWw/KiYHTohJqTrN.ADBcuSxXW6kCFXsYAr6PBj/sAEhiQ.17/wt2` |
| `qa-user-subject` | Subject Teacher | qa-user-subject@qa.local | `$2b$10$XWw/KiYHTohJqTrN.ADBcuSxXW6kCFXsYAr6PBj/sAEhiQ.17/wt2` |

## Role Definitions

| Role ID | Role Name | Description |
|---------|-----------|-------------|
| `role-admin` | System Administrator | Full system access including users, settings, and audit logs |
| `role-school-admin` | School Administrator | School-wide records, academics, analytics, and reports |
| `role-teacher` | Adviser | Assigned sections: advisory, attendance, assessments and behavior — not grade encoding |
| `role-records` | Records Personnel | Student records, enrollment, verification, historical records |
| `role-subject-teacher` | Subject Teacher | Encodes grades for assigned subject, grade level and section(s) only |
| `role-guidance` | Guidance Counselor | Records and manages student incidents, interventions, and student support information |
| `role-nurse` | Nurse | Health and nutrition records only — cannot edit general student information |
| `role-registrar` | Registrar | Strictly read-only official records plus student card / Form 137 printing |
| `role-literacy-coordinator` | Language & Literacy Coordinator | Reading, literacy and numeracy assessments and statistics |
| `role-admin-officer` | Admin Officer | Employee records, PERA/201 files and service credits — no student data access |
| `role-barangay` | Barangay User | Encodes and submits child records for their barangay |
| `role-lgu` | LGU User | Municipality-wide validation, duplicate review and reporting |

## Password Hash Format

All passwords use **bcrypt** with cost factor 10:
- Format: `$2b$10$<salt><hash>`
- Algorithm: bcrypt (Blowfish-based)
- Cost: 10 (2^10 = 1024 iterations)

## Testing Notes

### For QA Testing
The QA accounts (`qa-user-*`) all share the same password hash, meaning they use the same password. This is by design for automated testing.

### For Manual Testing
To test with a specific role:
1. Use the email from the table above
2. The password is not stored in plaintext — you would need to know the original password or reset it via the admin panel

### Seeding New Accounts
New accounts are created via the seed scripts (`scripts/seed.mts` or `scripts/seed-remote-reference.mts`) using environment variables:
- `DEFAULT_<ROLE>_EMAIL`
- `DEFAULT_<ROLE>_PASSWORD_HASH`
- `DEFAULT_<ROLE>_FIRST_NAME`
- `DEFAULT_<ROLE>_LAST_NAME`

If either email or password hash is missing, that role is skipped during seeding.

## Generated

This document was generated on 2026-11-08 by querying the Turso database `cms` via the Turso CLI.

```bash
turso db shell cms "SELECT users.id, roles.name, users.email, users.password_hash FROM users INNER JOIN roles ON users.role_id = roles.id"
```