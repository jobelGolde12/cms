# Removed Features

> STATUS: **PLAN** — features deleted by the school-only scope change.

| Feature | Old code touchpoints | Reason | Removal steps |
|---|---|---|---|
| Municipality management & reference data | `municipalities` table; `MUNICIPALITY` in `src/lib/constants.ts`; footer/header in `app-shell.tsx`; `MUNI_HEADER` in `report-data.ts` | Not a municipality system | Replace with school profile; archive table |
| Barangay management | `barangays` table; `src/actions/get-barangays.ts`; barangay filters in registry/duplicates/validation; barangay columns in tables | Not applicable | Remove actions/filters/columns; archive table |
| Barangay-scoped RBAC (`barangay` role) | `ROLES`, `ROLE_PERMISSIONS` in `permissions.ts`; `childScope` in `scope.ts`; user form role enum | Roles redefined | Re-seed roles; migrate users to new roles |
| LGU user role & workflows | `lgu` role; LGU wording in pages/README | Roles redefined | Same as above |
| Public self-registration | `src/app/register/page.tsx`; `src/actions/register.ts`; proxy matcher `/register` | Internal system; admin-provisioned accounts | Delete files; update matcher; document in README |
| Child census monitoring types (OSY, ECCD, disability, general welfare) | `childMonitoring.monitoringType`; monitoring pages `[type]`; `monitoringOverview` | School-only monitoring replaced (behavior, assessments, interventions) | Archive tables; remove pages/types |
| Out-of-school / not-yet-in-school education statuses | `child_education.educationStatus` values; OSY KPI + report | Replaced by real enrollment history | Transform to enrollments; archive |
| ECCD participation tracking | `child_eccd` table; KPI card; ECCD report | Early-childhood census not in scope | Archive (export first) |
| Disability census | `child_disabilities` table; disability KPI/report | Census purpose removed; sensitive data not carried forward | Archive (export first); school may re-add documented support notes later |
| Municipal / barangay summary reports | `barangay_summary`, `municipal_summary` report types | Replaced by school report catalog | Replace catalog in constants + builders |
| Household survey fields (sitio, household address) | `child_addresses.sitio/householdAddress` | Survey context removed | Single address field on student; archive table |
| DepEd Form 1 / census wording | README, welcome pages, verify pages | Different system purpose | Rewrite copy |
| `child_code_prefix` setting | `system_settings`; `child-code.ts` | Renamed concept | `student_number_prefix` (migration maps value) |

## Removal safety

Each removal that touches data follows `documentation/database/migration.md`
(archive-before-drop). Each removal that touches routes leaves no broken links
(nav, info cards, and cross-links updated in the same phase).
