/**
 * Retired demo identifiers — the guard rail that keeps the removed demo data
 * from ever coming back.
 *
 * On 2026-11-08 the Turso `cms` database was purged of every seeded/QA row
 * (see `documentation/user-data-cleanup.md`). The seed scripts that produced
 * those rows have been rewritten to create REFERENCE DATA ONLY, but a guard
 * is kept as a second line of defence: if a future script (or a careless
 * copy-paste) tries to recreate one of these identifiers, it fails loudly
 * instead of silently repopulating the production database.
 *
 * Scope rule: only identifiers the APPLICATION never generates are listed
 * here. The app creates students, sections, employees and users with
 * `crypto.randomUUID()` and derives student numbers (`SM-<year>-######`) and
 * employee numbers (`EMP-<year>-######`) from the live tables — so a blanket
 * "SM-2026-*" ban would block the school's own legitimate enrolment numbers.
 */

/**
 * Accounts removed from the system on 2026-11-05 as demo/test data. A seed
 * run must never bring them back — whatever the environment variables say.
 *
 * NOTE on `admin@gmail.com`: the address was the seeded demo administrator.
 * The live `user-admin` account (the real school administrator) currently
 * uses the same address. The deny-list only stops a SEED from provisioning
 * that address; it never touches an account that already exists, and the seed
 * is create-only for accounts.
 */
export const RETIRED_DEMO_EMAILS: ReadonlySet<string> = new Set([
  "admin@gmail.com",
  "school_admin@local.dev",
  "teacher@local.dev",
  "guidance@local.dev",
  "nurse@local.dev",
  "admin_officer@local.dev",
  "qa-integration@qa.local.dev",
]);

/** True for the retired demo addresses and for the whole `*@local.dev` domain. */
export function isRetiredDemoEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return RETIRED_DEMO_EMAILS.has(normalized) || normalized.endsWith("@local.dev");
}

/**
 * Seeded employee numbers (the fictional plantilla of the old dev seed).
 * The live employee `EMP-2026-000011` is a real record and is NOT listed.
 */
export const RETIRED_DEMO_EMPLOYEE_NUMBERS: ReadonlySet<string> = new Set(
  Array.from({ length: 10 }, (_, i) => `EMP-2026-${String(i + 1).padStart(6, "0")}`),
);

/**
 * Seeded section ids (`sec-<grade>-<index>` for Grades 7–10). The application
 * always creates sections with a UUID, so this prefix set is unambiguous.
 */
export const RETIRED_DEMO_SECTION_ID_PREFIXES: readonly string[] = [
  "sec-7-",
  "sec-8-",
  "sec-9-",
  "sec-10-",
];

/**
 * Seeded account ids. `user-admin` is deliberately absent — it is the real
 * administrator account (Mariel Anonuevo) and must never be blocked.
 */
export const RETIRED_DEMO_USER_IDS: ReadonlySet<string> = new Set([
  "user-school-admin",
  "user-teacher",
  "user-subject",
  "user-records",
  "user-guidance",
  "user-nurse",
  "user-registrar",
  "user-literacy",
  "user-admin-officer",
]);

export function isRetiredDemoEmployeeNumber(value: string): boolean {
  return RETIRED_DEMO_EMPLOYEE_NUMBERS.has(value.trim().toUpperCase());
}

export function isRetiredDemoSectionId(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return RETIRED_DEMO_SECTION_ID_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function isRetiredDemoUserId(value: string): boolean {
  return RETIRED_DEMO_USER_IDS.has(value.trim().toLowerCase());
}

/**
 * True when the identifier belongs to the retired demo data set in ANY
 * dimension (user id, section id or employee number).
 */
export function isRetiredDemoIdentifier(value: string): boolean {
  return (
    isRetiredDemoUserId(value) ||
    isRetiredDemoSectionId(value) ||
    isRetiredDemoEmployeeNumber(value)
  );
}

/**
 * Throws when the identifier belongs to the retired demo data set. Used by the
 * seed scripts as a hard stop before any insert.
 */
export function assertNotRetiredDemoIdentifier(value: string): void {
  if (isRetiredDemoIdentifier(value)) {
    throw new Error(
      `Refusing to create "${value}": this identifier belongs to the demo data removed on 2026-11-08 and must not be recreated.`,
    );
  }
}
