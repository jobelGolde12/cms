# Schema — Municipal Child Mapping System

Every table implemented in `src/db/schema.ts`.

---

## ROLES

```text
Table: roles
Purpose: Application roles (no School User).
```

Columns:
- `id` (PK)
- `name` (UNIQUE) — `Barangay User`, `LGU User`, `System Administrator`
- `description`
- `created_at`, `updated_at`

---

## PERMISSIONS

```text
Table: permissions
Purpose: Granular access permissions.
```

Columns:
- `id` (PK)
- `name` (UNIQUE) — e.g. `children.view`, `validation.review`
- `description`
- `module`, `action`
- `created_at`

---

## ROLE_PERMISSIONS

```text
Table: role_permissions
Purpose: Many-to-many mapping of roles to permissions.
PK: (role_id, permission_id)
```

Columns:
- `role_id` (PK, FK → roles.id)
- `permission_id` (PK, FK → permissions.id)
- `created_at`

---

## MUNICIPALITIES

```text
Table: municipalities
Purpose: Reference entity for the municipality.
```

Columns:
- `id` (PK)
- `name`
- `province`
- `region`
- `short_name`
- `created_at`, `updated_at`

---

## BARANGAYS

```text
Table: barangays
Purpose: Reference data for municipality barangays.
```

Columns:
- `id` (PK)
- `name` (UNIQUE)
- `code` (UNIQUE, nullable)
- `is_active`
- `created_at`, `updated_at`

Indexes: `name`, `code`

---

## SCHOOLS

```text
Table: schools
Purpose: Reference entity only. NOT an authenticated role.
```

Columns:
- `id` (PK)
- `barangay_id` (FK → barangays.id, nullable)
- `name`
- `school_code` (UNIQUE, nullable)
- `school_type`
- `address` (nullable)
- `is_active`
- `created_at`, `updated_at`

---

## USERS

```text
Table: users
Purpose: Authenticated accounts.
```

Columns:
- `id` (PK)
- `role_id` (FK → roles.id)
- `barangay_id` (FK → barangays.id, nullable)
- `first_name`, `middle_name`, `last_name`
- `email` (UNIQUE)
- `password_hash`
- `phone` (nullable)
- `is_active`
- `last_login_at` (nullable)
- `created_at`, `updated_at`

Unique constraints: `email`
Indexes: `email`, `role_id`, `barangay_id`, `is_active`

Note: No `school_user` role exists. Schools are reference data only.

---

## SESSIONS

```text
Table: sessions
Purpose: Server-side session storage (opaque token hash, not raw token).
```

Columns:
- `id` (PK)
- `token_hash`
- `user_id` (FK → users.id, `onDelete: cascade`)
- `expires_at`
- `ip`, `user_agent`
- `created_at`

Indexes: `token_hash` (unique), `user_id`

---

## CHILDREN

```text
Table: children
Purpose: Central registry for child mapping records.
```

Columns (key fields):
- `id` (PK)
- `child_code` (UNIQUE) — e.g. `CM-2026-000001`
- `first_name`, `middle_name`, `last_name`, `suffix`
- `birth_date`, `sex`
- `barangay_id` (FK → barangays.id, NOT NULL)
- `address_details`
- `guardian_name`, `guardian_contact`
- `educational_status`, `school_id` (FK → schools.id, nullable), `grade_level`, `school_year`
- `eccd_status`, `eccd_center`, `eccd_non_participation_reason`
- `disability_status`, `disability_type`, `disability_support_required`, `disability_support_provided`, `disability_referral`
- `validation_status` (`draft` | `submitted` | `pending_validation` | `needs_correction` | `resubmitted` | `verified`)
- `duplicate_status` (`none` | `potential` | `confirmed_duplicate` | `resolved`)
- `notes`
- `created_by` (FK → users.id, NOT NULL)
- `submitted_at`, `verified_by` (FK → users.id, nullable), `verified_at`, `validation_notes`
- `created_at`, `updated_at`

Indexes: `child_code`, `last_name` + `first_name`, `birth_date`, `validation_status`, `barangay_id`, `school_id`

---

## CHILD_ADDRESSES

```text
Table: child_addresses
Purpose: Address history for children.
```

Columns:
- `id` (PK)
- `child_id` (FK → children.id)
- `barangay_id` (FK → barangays.id)
- `household_address`
- `sitio` (nullable)
- `is_current`
- `created_at`, `updated_at`

---

## CHILD_EDUCATION

```text
Table: child_education
Purpose: Educational record history.
```

Columns:
- `id` (PK)
- `child_id` (FK → children.id)
- `school_id` (FK → schools.id, nullable)
- `education_status` (`enrolled` | `out_of_school` | `not_yet_in_school` | `graduated` | `unknown`)
- `grade_level` (nullable)
- `school_year` (nullable)
- `enrollment_status` (nullable)
- `is_current`
- `created_at`, `updated_at`

---

## CHILD_ECCD

```text
Table: child_eccd
Purpose: ECCD participation records.
```

Columns:
- `id` (PK)
- `child_id` (FK → children.id)
- `participation_status` (`participating` | `not_participating` | `unknown`)
- `program_name` (nullable)
- `provider` (nullable)
- `start_date` (nullable)
- `end_date` (nullable)
- `remarks` (nullable)
- `created_at`, `updated_at`

---

## CHILD_DISABILITIES

```text
Table: child_disabilities
Purpose: Sensitive disability information (protected server-side).
```

Columns:
- `id` (PK)
- `child_id` (FK → children.id)
- `has_disability`
- `disability_type` (nullable)
- `description` (nullable)
- `support_needed` (nullable)
- `assistance_status` (nullable)
- `verified` (boolean)
- `created_at`, `updated_at`

---

## CHILD_VALIDATIONS

```text
Table: child_validations
Purpose: Validation workflow history (NOT a single boolean; full history preserved).
```

Columns:
- `id` (PK)
- `child_id` (FK → children.id)
- `submitted_by` (FK → users.id)
- `reviewed_by` (FK → users.id, nullable)
- `status` (`pending` | `approved` | `needs_correction` | `rejected`)
- `remarks` (nullable)
- `submitted_at`
- `reviewed_at` (nullable)
- `created_at`, `updated_at`

---

## CHILD_DUPLICATE_CANDIDATES

```text
Table: child_duplicate_candidates
Purpose: Possible duplicate review (requires human review; never automatic deletion).
```

Columns:
- `id` (PK)
- `child_id` (FK → children.id)
- `possible_child_id` (FK → children.id)
- `match_score` (nullable)
- `match_reason` (nullable)
- `status` (`pending` | `confirmed_duplicate` | `not_duplicate` | `dismissed`)
- `reviewed_by` (FK → users.id, nullable)
- `review_notes` (nullable)
- `created_at`, `updated_at`

---

## CHILD_MONITORING

```text
Table: child_monitoring
Purpose: Monitoring records (education, OSY, ECCD, disability, general).
```

Columns:
- `id` (PK)
- `child_id` (FK → children.id)
- `monitoring_type` (`education` | `out_of_school_youth` | `eccd` | `disability` | `general`)
- `status`
- `observed_at`
- `recorded_by` (FK → users.id)
- `remarks` (nullable)
- `created_at`, `updated_at`

---

## INTERVENTIONS

```text
Table: interventions
Purpose: Child-level interventions.
```

Columns:
- `id` (PK)
- `child_id` (FK → children.id)
- `intervention_type`
- `description`
- `status` (`planned` | `ongoing` | `completed` | `cancelled`)
- `priority` (nullable)
- `start_date` (nullable)
- `target_date` (nullable)
- `completed_date` (nullable)
- `assigned_to` (FK → users.id, nullable)
- `created_by` (FK → users.id)
- `created_at`, `updated_at`

---

## INTERVENTION_FOLLOWUPS

```text
Table: intervention_followups
Purpose: Follow-up activities linked to interventions.
```

Columns:
- `id` (PK)
- `intervention_id` (FK → interventions.id)
- `follow_up_date`
- `status`
- `notes` (nullable)
- `recorded_by` (FK → users.id)
- `created_at`, `updated_at`

---

## QR_VERIFICATIONS

```text
Table: qr_verifications
Purpose: Secure QR verification events (token resolves to authorized info, NOT embedded personal data).
```

Columns:
- `id` (PK)
- `child_id` (FK → children.id)
- `verification_token`
- `verified_by` (FK → users.id, nullable)
- `verification_type`
- `result`
- `verified_at`
- `ip_address` (nullable)
- `user_agent` (nullable)

---

## REPORTS

```text
Table: reports
Purpose: Report metadata.
```

Columns:
- `id` (PK)
- `name`
- `report_type` (`child_registry` | `educational_status` | `out_of_school_youth` | `eccd` | `disability` | `intervention` | `barangay_summary` | `municipal_summary`)
- `generated_by` (FK → users.id)
- `scope`
- `filters_json`
- `created_at`

---

## REPORT_EXPORTS

```text
Table: report_exports
Purpose: Export metadata (PDF / XLSX / CSV).
```

Columns:
- `id` (PK)
- `report_id` (FK → reports.id)
- `format` (`PDF` | `XLSX` | `CSV`)
- `file_reference`
- `generated_by` (FK → users.id)
- `created_at`
- `expires_at` (nullable)

---

## NOTIFICATIONS

```text
Table: notifications
Purpose: User notifications.
```

Columns:
- `id` (PK)
- `user_id` (FK → users.id, `onDelete: cascade`)
- `type`
- `title`
- `message`
- `link` (nullable)
- `is_read`
- `created_at`
- `read_at` (nullable)

---

## AUDIT_LOGS

```text
Table: audit_logs
Purpose: Append-only audit events.
```

Columns:
- `id` (PK)
- `user_id` (FK → users.id, `onDelete: set null`)
- `action`
- `entity_type`
- `entity_id`
- `old_values_json` (nullable)
- `new_values_json` (nullable)
- `ip_address` (nullable)
- `user_agent` (nullable)
- `created_at`

---

## SYSTEM_SETTINGS

```text
Table: system_settings
Purpose: System configuration (NO secrets stored here).
```

Columns:
- `id` (PK)
- `key` (UNIQUE)
- `value`
- `description` (nullable)
- `updated_by` (FK → users.id, nullable)
- `updated_at`

Seeded settings include:
- `system_name`
- `child_code_prefix`
- `default_school_year`
- `maintenance_mode`

Never store passwords, API secrets, database credentials, or Turso tokens here.
