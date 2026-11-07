"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  employee201Records,
  employees,
  sections,
  serviceCreditTransactions,
  userRoles,
  users,
  type NewEmployee,
} from "@/db/schema";
import { getAuthorizedUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { computeBalance, validateCreditAmount } from "@/lib/employees";
import { nextEmployeeNumber } from "@/lib/employee-number";
import {
  applyTeachingLoads,
  clearTeachingLoads,
  parseTeachingLoads,
  SUBJECT_TEACHER_ROLE_ID,
  teachingLoadsForTeacher,
  validateTeachingLoads,
  type TeachingLoad,
} from "@/lib/teaching-loads";
import {
  employee201Schema,
  employeeFormSchema,
  serviceCreditSchema,
} from "@/lib/schemas";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

const scrub = (value: string | undefined | null | ""): string | null =>
  value && String(value).trim() ? String(value).trim() : null;

/** Collect the message chain of an error (including nested `cause`s). */
function errorText(error: unknown, depth = 0): string {
  if (error === null || error === undefined || depth > 5) return "";
  if (error instanceof Error) {
    const own = `${error.name}: ${error.message}`;
    const cause = (error as { cause?: unknown }).cause;
    return `${own} ${cause ? errorText(cause, depth + 1) : ""}`;
  }
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const record = error as { message?: unknown; cause?: unknown };
    const own = typeof record.message === "string" ? record.message : "";
    return `${own} ${record.cause ? errorText(record.cause, depth + 1) : ""}`;
  }
  return String(error);
}

/**
 * True when the failure is a unique-constraint violation on the employee
 * number — the only error worth retrying with a freshly generated number.
 */
function isEmployeeNumberConflict(error: unknown): boolean {
  const text = errorText(error).toLowerCase();
  return text.includes("unique constraint failed") && text.includes("employee_number");
}

/**
 * Paid position resolved from the controlled Select: `other` stores the
 * accompanying free-text description (or the literal "other" when blank).
 */
function resolvedPosition(v: {
  position?: string;
  otherPosition?: string;
}): string | null {
  const key = scrub(v.position);
  if (!key) return null;
  if (key === "other") return scrub(v.otherPosition) ?? "other";
  return key;
}

function parseEmployeeForm(formData: FormData) {
  return employeeFormSchema.safeParse(Object.fromEntries(formData.entries()));
}

/** Position helpers: a teacher may be an adviser, a subject teacher, or both. */
const isAdviserPosition = (position: string | null | undefined): boolean =>
  position === "adviser" || position === "adviser_subject_teacher";
const isSubjectTeacherPosition = (position: string | null | undefined): boolean =>
  position === "subject_teacher" || position === "adviser_subject_teacher";

/** Build the DB row values from validated form data (nulls for blanks). */
function employeeValues(v: Awaited<ReturnType<typeof employeeFormSchema.parse>>) {
  const position = resolvedPosition(v);
  return {
    firstName: v.firstName,
    middleName: scrub(v.middleName),
    lastName: v.lastName,
    suffix: scrub(v.suffix),
    birthDate: scrub(v.birthDate),
    sex: v.sex,
    civilStatus: scrub(v.civilStatus),
    address: scrub(v.address),
    contactNumber: scrub(v.contactNumber),
    email: scrub(v.email),
    emergencyContactName: scrub(v.emergencyContactName),
    emergencyContactRelation: scrub(v.emergencyContactRelation),
    emergencyContactNumber: scrub(v.emergencyContactNumber),
    position,
    /** Section assignment attaches to an adviser (including adviser + teacher). */
    assignedSectionId: isAdviserPosition(position) ? scrub(v.assignedSectionId) : null,
    /**
     * Login-account link attaches to a subject-teaching position (including
     * adviser + teacher) — it is the account that carries the grade-encoding
     * teaching loads.
     */
    userId: isSubjectTeacherPosition(position) ? scrub(v.userId) : null,
    designation: scrub(v.designation),
    appointmentStatus: scrub(v.appointmentStatus),
    employmentType: scrub(v.employmentType),
    department: scrub(v.department),
    dateHired: scrub(v.dateHired),
    dateOfAppointment: scrub(v.dateOfAppointment),
    salaryGrade: scrub(v.salaryGrade),
    step: scrub(v.step),
    gsisNumber: scrub(v.gsisNumber),
    philhealthNumber: scrub(v.philhealthNumber),
    pagibigNumber: scrub(v.pagibigNumber),
    tinNumber: scrub(v.tinNumber),
    prcLicenseNumber: scrub(v.prcLicenseNumber),
    eligibility: scrub(v.eligibility),
  };
}

/** Reject duplicate employee numbers early with a friendly message. */
async function employeeNumberTaken(employeeNumber: string, excludeId?: string): Promise<boolean> {
  const where = excludeId
    ? and(eq(employees.employeeNumber, employeeNumber), ne(employees.id, excludeId))
    : eq(employees.employeeNumber, employeeNumber);
  const rows = await db.select({ id: employees.id }).from(employees).where(where).limit(1);
  return rows.length > 0;
}

/**
 * Server-side adviser-assignment validation (client checks are never
 * trusted):
 *
 *   1. the referenced section must EXIST — FK alone would surface a raw DB
 *      error back to the user;
 *   2. the section must be active;
 *   3. position !== 'adviser' can never carry an assignment (cleared above);
 *   4. an active adviser from another employee record may not be re-assigned
 *      to the same section (one active adviser per section).
 */
async function validateAdviserAssignment(
  v: Awaited<ReturnType<typeof employeeFormSchema.parse>>,
  excludeEmployeeId?: string,
): Promise<{ ok: true; sectionName: string | null } | { ok: false; error: string }> {
  const sectionId = scrub(v.assignedSectionId);
  if (!isAdviserPosition(scrub(v.position))) {
    // Assignment silently cleared for positions without advisory duties.
    return { ok: true, sectionName: null };
  }
  if (!sectionId) return { ok: true, sectionName: null };

  const sectionRows = await db
    .select({ id: sections.id, name: sections.name, isActive: sections.isActive })
    .from(sections)
    .where(eq(sections.id, sectionId))
    .limit(1);
  const section = sectionRows[0];
  if (!section) {
    return { ok: false, error: "Assigned section not found — select a valid section." };
  }
  if (!section.isActive) {
    return { ok: false, error: "That section is deactivated — re-activate it before assigning an adviser." };
  }

  const conflictRows = await db
    .select({
      id: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      employeeNumber: employees.employeeNumber,
    })
    .from(employees)
    .where(
      and(
        eq(employees.assignedSectionId, sectionId),
        eq(employees.status, "active"),
        excludeEmployeeId ? ne(employees.id, excludeEmployeeId) : undefined,
      ),
    )
    .limit(1);
  const conflict = conflictRows[0];
  if (conflict) {
    return {
      ok: false,
      error: `Section ${section.name} already has an active adviser (${conflict.firstName} ${conflict.lastName}, ${conflict.employeeNumber}).`,
    };
  }
  return { ok: true, sectionName: section.name };
}

/**
 * Server-side validation of the Subject Teacher account link and the
 * teaching loads (the grade-encoding scope):
 *
 *   1. only the `subject_teacher` position may carry an account link;
 *   2. the linked account must EXIST, be ACTIVE and hold the
 *      `subject_teacher` role — a client dropdown is never trusted;
 *   3. an account already linked to another personnel record may not be
 *      re-used (one account backs one employee);
 *   4. every (section, subject) pair must point at an existing, active
 *      section and subject.
 */
async function validateSubjectTeacherScope(
  v: Awaited<ReturnType<typeof employeeFormSchema.parse>>,
  formData: FormData,
  excludeEmployeeId?: string,
): Promise<
  | { ok: true; accountId: string | null; loads: TeachingLoad[] }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
> {
  if (!isSubjectTeacherPosition(scrub(v.position))) {
    // Account link and teaching loads only apply to subject-teaching positions.
    return { ok: true, accountId: null, loads: [] };
  }

  const accountId = scrub(v.userId);
  const submitted = parseTeachingLoads(formData.getAll("teachingLoad").map(String));

  if (!accountId) {
    if (submitted.length > 0) {
      return {
        ok: false,
        error:
          "Link a Subject Teacher login account before assigning teaching loads — grade encoding follows the account.",
        fieldErrors: { userId: "Link the login account first" },
      };
    }
    return { ok: true, accountId: null, loads: [] };
  }

  const accountRows = await db
    .select({
      id: users.id,
      roleId: users.roleId,
      isActive: users.isActive,
      subjectTeacherRoleId: userRoles.roleId,
      linkedEmployeeId: employees.id,
      linkedEmployeeNumber: employees.employeeNumber,
    })
    .from(users)
    .leftJoin(employees, eq(employees.userId, users.id))
    .leftJoin(
      userRoles,
      and(eq(userRoles.userId, users.id), eq(userRoles.roleId, SUBJECT_TEACHER_ROLE_ID)),
    )
    .where(eq(users.id, accountId))
    .limit(1);
  const account = accountRows[0];
  if (!account) {
    return {
      ok: false,
      error: "Linked login account not found — select a valid account.",
      fieldErrors: { userId: "Account not found" },
    };
  }
  if (!account.isActive) {
    return {
      ok: false,
      error: "That login account is deactivated — re-activate it before linking it.",
      fieldErrors: { userId: "Account is deactivated" },
    };
  }
  if (account.roleId !== SUBJECT_TEACHER_ROLE_ID && account.subjectTeacherRoleId !== SUBJECT_TEACHER_ROLE_ID) {
    return {
      ok: false,
      error:
        "The linked account must hold the Subject Teacher role (primary or additional role) to carry teaching loads. Grant it on the Users page first.",
      fieldErrors: { userId: "Account must hold the Subject Teacher role" },
    };
  }
  if (account.linkedEmployeeId && account.linkedEmployeeId !== excludeEmployeeId) {
    return {
      ok: false,
      error: `That login account is already linked to employee ${account.linkedEmployeeNumber}.`,
      fieldErrors: { userId: "Account already linked to another employee" },
    };
  }

  const validated = await validateTeachingLoads(submitted);
  if (!validated.ok) {
    return {
      ok: false,
      error: validated.error,
      fieldErrors: { teachingLoad: validated.error },
    };
  }

  return { ok: true, accountId, loads: validated.pairs };
}

/**
 * Apply the teaching-load plan to the linked account: loads that were
 * dropped are removed, new loads are inserted, and a (section, subject) pair
 * owned by another teacher is moved to this teacher.
 */
async function syncTeachingLoads(
  accountId: string | null,
  previousAccountId: string | null,
  loads: TeachingLoad[],
): Promise<{ added: number; removed: number; moved: number }> {
  if (!accountId) {
    // The record no longer points at an account — the old account keeps
    // nothing that was managed through this form.
    if (previousAccountId) {
      const removed = await clearTeachingLoads(previousAccountId);
      return { added: 0, removed, moved: 0 };
    }
    return { added: 0, removed: 0, moved: 0 };
  }

  if (previousAccountId && previousAccountId !== accountId) {
    await clearTeachingLoads(previousAccountId);
  }

  const current = await teachingLoadsForTeacher(accountId);
  const result = await applyTeachingLoads(accountId, current, loads);
  return {
    added: result.added.length,
    removed: result.removed.length,
    moved: result.moved.length,
  };
}

/** Create a new employee record. */
export async function createEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("employees.create");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to create employee records.");

  const parsed = parseEmployeeForm(formData);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;

  const assignment = await validateAdviserAssignment(v);
  if (!assignment.ok) return fail(assignment.error, { assignedSectionId: "Section already assigned or invalid" });

  const scope = await validateSubjectTeacherScope(v, formData);
  if (!scope.ok) return fail(scope.error, scope.fieldErrors);

  let number: string;
  if (v.employeeNumber && String(v.employeeNumber).trim()) {
    number = String(v.employeeNumber).trim();
    if (await employeeNumberTaken(number)) {
      return fail("That employee number is already in use.", {
        employeeNumber: "Employee number already in use",
      });
    }
  } else {
    number = await nextEmployeeNumber();
  }

  const employeeId = crypto.randomUUID();
  let inserted = false;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
    if (attempt > 0) number = await nextEmployeeNumber();
    try {
      const values: NewEmployee = {
        id: employeeId,
        employeeNumber: number,
        ...employeeValues(v),
        status: "active",
        createdBy: user.id,
        updatedBy: user.id,
      };
      await db.insert(employees).values(values);
      inserted = true;
    } catch (error) {
      lastError = error;
      // Only a unique-constraint violation on the employee number is worth a
      // retry with a fresh number. Any other failure (a missing column, a
      // constraint violation, a connectivity error) is reported as-is —
      // retrying it silently hid real database errors behind a generic
      // "Could not create the record" message.
      if (!isEmployeeNumberConflict(error)) {
        console.error("[createEmployee] insert failed", error);
        break;
      }
      console.warn("[createEmployee] employee number collision — retrying", error);
      inserted = false;
    }
  }
  if (!inserted) {
    console.error("[createEmployee] insert failed", lastError);
    return fail(
      isEmployeeNumberConflict(lastError)
        ? "Could not create the record — that employee number is already in use. Please try again."
        : "Could not create the record. The database rejected the save — check the employee details and try again.",
    );
  }

  // Grade-encoding scope: the teaching loads of the linked account.
  const loadChanges = await syncTeachingLoads(scope.accountId, null, scope.loads);

  await logAudit({
    userId: user.id,
    action: "CREATE_EMPLOYEE",
    entityType: "employee",
    entityId: employeeId,
    newValues: {
      employeeNumber: number,
      position: resolvedPosition(v),
      linkedAccountId: scope.accountId,
      teachingLoads: scope.loads.length,
      teachingLoadsChanged: loadChanges,
    },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/employees");
  revalidatePath("/dashboard");
  return ok("Employee record created.", `/employees/${employeeId}`);
}

/** Update an existing employee record. */
export async function updateEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("employees.update");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to edit employee records.");

  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) return fail("Missing record identifier.");

  const rows = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  const employee = rows[0];
  if (!employee) return fail("Employee record not found.");

  const parsed = parseEmployeeForm(formData);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;

  const assignment = await validateAdviserAssignment(v, employeeId);
  if (!assignment.ok) return fail(assignment.error, { assignedSectionId: "Section already assigned or invalid" });

  const scope = await validateSubjectTeacherScope(v, formData, employeeId);
  if (!scope.ok) return fail(scope.error, scope.fieldErrors);

  if (v.employeeNumber && String(v.employeeNumber).trim()) {
    const number = String(v.employeeNumber).trim();
    if (number !== employee.employeeNumber && (await employeeNumberTaken(number, employeeId))) {
      return fail("That employee number is already in use.", {
        employeeNumber: "Employee number already in use",
      });
    }
  }

  try {
    await db
      .update(employees)
      .set({
        ...(v.employeeNumber && String(v.employeeNumber).trim()
          ? { employeeNumber: String(v.employeeNumber).trim() }
          : {}),
        ...employeeValues(v),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, employeeId));
  } catch (error) {
    console.error("[updateEmployee] failed", error);
    return fail("Could not update the record. Please try again.");
  }

  // Grade-encoding scope: the teaching loads of the (possibly new) account.
  const loadChanges = await syncTeachingLoads(scope.accountId, employee.userId, scope.loads);

  await logAudit({
    userId: user.id,
    action: "UPDATE_EMPLOYEE",
    entityType: "employee",
    entityId: employeeId,
    oldValues: {
      status: employee.status,
      position: employee.position,
      assignedSectionId: employee.assignedSectionId,
      linkedAccountId: employee.userId,
    },
    newValues: {
      position: resolvedPosition(v),
      assignedSectionId: await currentAssignedSectionId(employeeId),
      linkedAccountId: scope.accountId,
      teachingLoadsChanged: loadChanges,
    },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/dashboard");
  return ok("Employee record updated.");
}

/** Read the freshly saved assignment for the audit trail (post-update value). */
async function currentAssignedSectionId(employeeId: string): Promise<string | null> {
  const rows = await db
    .select({ assignedSectionId: employees.assignedSectionId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  return rows[0]?.assignedSectionId ?? null;
}

/**
 * Archive (soft delete) an employee record. History is retained; the row is
 * hidden from active lists and service-credit changes stay auditable.
 */
export async function archiveEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("employees.archive");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to archive employee records.");

  const employeeId = String(formData.get("employeeId") ?? "");
  const rows = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  const employee = rows[0];
  if (!employee) return fail("Employee record not found.");

  await db
    .update(employees)
    .set({ status: "archived", updatedBy: user.id, updatedAt: new Date() })
    .where(eq(employees.id, employeeId));

  // An archived employee must not keep a grade-encoding scope: the teaching
  // loads of the linked account are dropped with the record.
  let clearedLoads = 0;
  if (employee.userId) {
    clearedLoads = await clearTeachingLoads(employee.userId);
  }

  await logAudit({
    userId: user.id,
    action: "ARCHIVE_EMPLOYEE",
    entityType: "employee",
    entityId: employeeId,
    oldValues: { status: employee.status },
    newValues: { status: "archived", teachingLoadsCleared: clearedLoads },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return ok("Employee record archived. It is retained for history but hidden from active lists.");
}

/** Restore an archived employee back to active service. */
export async function reactivateEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("employees.archive");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to restore employee records.");

  const employeeId = String(formData.get("employeeId") ?? "");
  const rows = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  const employee = rows[0];
  if (!employee) return fail("Employee record not found.");
  if (employee.status !== "archived") return fail("Only archived records can be restored.");

  await db
    .update(employees)
    .set({ status: "active", updatedBy: user.id, updatedAt: new Date() })
    .where(eq(employees.id, employeeId));

  await logAudit({
    userId: user.id,
    action: "RESTORE_EMPLOYEE",
    entityType: "employee",
    entityId: employeeId,
    oldValues: { status: "archived" },
    newValues: { status: "active" },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  return ok("Employee record restored.");
}

/* ------------------------------- 201 file -------------------------------- */

/** Add a personnel-document entry to the employee's 201 file. */
export async function create201Record(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("employee_201.manage");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage 201 files.");

  const parsed = employee201Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;

  const employeeRows = await db
    .select({ id: employees.id, status: employees.status })
    .from(employees)
    .where(eq(employees.id, v.employeeId))
    .limit(1);
  const employee = employeeRows[0];
  if (!employee) return fail("Employee record not found.");
  if (employee.status === "archived") {
    return fail("This employee record is archived — restore it before adding 201 entries.");
  }

  const recordId = crypto.randomUUID();
  try {
    await db.insert(employee201Records).values({
      id: recordId,
      employeeId: v.employeeId,
      category: v.category,
      title: v.title,
      description: scrub(v.description),
      recordDate: v.recordDate,
      fileReference: scrub(v.fileReference),
      createdBy: user.id,
      updatedBy: user.id,
    });
  } catch (error) {
    console.error("[create201Record] failed", error);
    return fail("Could not save the record. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "CREATE_201_RECORD",
    entityType: "employee_201_record",
    entityId: recordId,
    newValues: { employeeId: v.employeeId, category: v.category, title: v.title },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/employees/${v.employeeId}/201`);
  revalidatePath(`/employees/${v.employeeId}`);
  return ok("201 file entry added.");
}

/** Edit an existing 201 file entry. */
export async function update201Record(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("employee_201.manage");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage 201 files.");

  const recordId = String(formData.get("recordId") ?? "");
  if (!recordId) return fail("Missing record identifier.");

  const rows = await db
    .select()
    .from(employee201Records)
    .where(eq(employee201Records.id, recordId))
    .limit(1);
  const record = rows[0];
  if (!record) return fail("201 file entry not found.");

  const parsed = employee201Schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;
  if (v.employeeId !== record.employeeId) return fail("Record owner mismatch.");

  try {
    await db
      .update(employee201Records)
      .set({
        category: v.category,
        title: v.title,
        description: scrub(v.description),
        recordDate: v.recordDate,
        fileReference: scrub(v.fileReference),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(employee201Records.id, recordId));
  } catch (error) {
    console.error("[update201Record] failed", error);
    return fail("Could not save the record. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "UPDATE_201_RECORD",
    entityType: "employee_201_record",
    entityId: recordId,
    oldValues: { title: record.title, category: record.category },
    newValues: { title: v.title, category: v.category },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/employees/${record.employeeId}/201`);
  return ok("201 file entry updated.");
}

/** Archive a 201 entry (never physically deletes personnel history). */
export async function archive201Record(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getAuthorizedUser("employee_201.manage");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage 201 files.");

  const recordId = String(formData.get("recordId") ?? "");
  const rows = await db
    .select()
    .from(employee201Records)
    .where(eq(employee201Records.id, recordId))
    .limit(1);
  const record = rows[0];
  if (!record) return fail("201 file entry not found.");

  await db
    .update(employee201Records)
    .set({ isArchived: true, updatedBy: user.id, updatedAt: new Date() })
    .where(eq(employee201Records.id, recordId));

  await logAudit({
    userId: user.id,
    action: "ARCHIVE_201_RECORD",
    entityType: "employee_201_record",
    entityId: recordId,
    oldValues: { isArchived: record.isArchived },
    newValues: { isArchived: true },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/employees/${record.employeeId}/201`);
  return ok("201 file entry archived.");
}

/* ---------------------------- service credits ----------------------------- */

/**
 * Ledger rule: a `consumed` transaction can never drive the derived balance
 * negative. For inserts, everything else in the ledger stays untouched, so
 * current balance must cover the new amount. For edits, the row being edited
 * contributes its NEW credits while the ledger keeps its OLD credits — both
 * are computed against the same live ledger.
 */
async function balanceForEmployee(
  employeeId: string,
  edit?: { txId: string; newCredits: number },
): Promise<number> {
  const rows = await db
    .select({
      type: serviceCreditTransactions.type,
      total: sql<string>`sum(${serviceCreditTransactions.credits})`,
    })
    .from(serviceCreditTransactions)
    .where(eq(serviceCreditTransactions.employeeId, employeeId))
    .groupBy(serviceCreditTransactions.type);

  const total = (t: string) => Number(rows.find((r) => r.type === t)?.total ?? 0) || 0;
  let balance = total("earned") - total("consumed");
  if (edit) {
    const self = await db
      .select({ type: serviceCreditTransactions.type, credits: serviceCreditTransactions.credits })
      .from(serviceCreditTransactions)
      .where(eq(serviceCreditTransactions.id, edit.txId))
      .limit(1);
    const oldType = self[0]?.type;
    const oldCredits = Number(self[0]?.credits ?? 0);
    if (oldType === "earned") balance = balance - oldCredits + edit.newCredits;
    else if (oldType === "consumed") balance = balance + oldCredits - edit.newCredits;
  }
  return computeBalance(balance, 0);
}

/** Add an earned/consumed transaction to an employee's service credits. */
export async function addServiceCreditTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("service_credits.manage");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage service credits.");

  const parsed = serviceCreditSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;

  const employeeRows = await db
    .select({ id: employees.id, status: employees.status })
    .from(employees)
    .where(eq(employees.id, v.employeeId))
    .limit(1);
  const employee = employeeRows[0];
  if (!employee) return fail("Employee record not found.");
  if (employee.status === "archived") {
    return fail("This employee record is archived — restore it before crediting transactions.");
  }

  if (v.type === "consumed") {
    const balance = await balanceForEmployee(v.employeeId);
    const amountError = validateCreditAmount(v.type, v.credits, balance);
    if (amountError) {
      return fail(amountError, { credits: amountError.replace("Insufficient service credits. ", "") });
    }
  }

  const txId = crypto.randomUUID();
  try {
    await db.insert(serviceCreditTransactions).values({
      id: txId,
      employeeId: v.employeeId,
      type: v.type,
      credits: v.credits,
      transactionDate: v.transactionDate,
      reason: v.reason,
      referenceDocument: scrub(v.referenceDocument),
      remarks: scrub(v.remarks),
      createdBy: user.id,
      updatedBy: user.id,
    });
  } catch (error) {
    console.error("[addServiceCreditTransaction] failed", error);
    return fail("Could not save the transaction. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "SERVICE_CREDIT_ADD",
    entityType: "service_credit_transaction",
    entityId: txId,
    newValues: { employeeId: v.employeeId, type: v.type, credits: v.credits },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/employees/${v.employeeId}/service-credits`);
  revalidatePath("/service-credits");
  revalidatePath("/dashboard");
  return ok("Service credit transaction recorded.");
}

/** Correct an existing transaction WITHOUT deleting it — audit trail preserved. */
export async function updateServiceCreditTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("service_credits.manage");
  const { ip, userAgent } = await sessionMetadata();
  if (!user) return fail("You do not have permission to manage service credits.");

  const txId = String(formData.get("transactionId") ?? "");
  if (!txId) return fail("Missing transaction identifier.");

  const rows = await db
    .select()
    .from(serviceCreditTransactions)
    .where(eq(serviceCreditTransactions.id, txId))
    .limit(1);
  const tx = rows[0];
  if (!tx) return fail("Transaction not found.");

  // Archived employees must not receive mutations — same guard as the add
  // action; an error surfaces before any balance projection runs.
  const employeeRows = await db
    .select({ status: employees.status })
    .from(employees)
    .where(eq(employees.id, tx.employeeId))
    .limit(1);
  if (!employeeRows[0]) return fail("Employee record not found.");
  if (employeeRows[0].status === "archived") {
    return fail("This employee record is archived — restore it before correcting transactions.");
  }

  const parsed = serviceCreditSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;
  if (v.employeeId !== tx.employeeId) return fail("Transaction owner mismatch.");

  if (v.type === "consumed") {
    // Validated with the authoritative recomputation (projected balance < 0 is invalid):
    const projected = await balanceForEmployee(v.employeeId, { txId, newCredits: v.credits });
    if (projected < 0) {
      return fail(
        `This correction would make the balance negative (projected ${projected.toFixed(2)}).`,
        { credits: "Correction exceeds the available balance" },
      );
    }
  }

  try {
    await db
      .update(serviceCreditTransactions)
      .set({
        type: v.type,
        credits: v.credits,
        transactionDate: v.transactionDate,
        reason: v.reason,
        referenceDocument: scrub(v.referenceDocument),
        remarks: scrub(v.remarks),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(serviceCreditTransactions.id, txId));
  } catch (error) {
    console.error("[updateServiceCreditTransaction] failed", error);
    return fail("Could not update the transaction. Please try again.");
  }

  await logAudit({
    userId: user.id,
    action: "SERVICE_CREDIT_UPDATE",
    entityType: "service_credit_transaction",
    entityId: txId,
    oldValues: { type: tx.type, credits: tx.credits, transactionDate: tx.transactionDate },
    newValues: { type: v.type, credits: v.credits, transactionDate: v.transactionDate },
    ipAddress: ip,
    userAgent,
  });

  revalidatePath(`/employees/${v.employeeId}/service-credits`);
  revalidatePath("/service-credits");
  return ok("Transaction corrected. The audit trail keeps the previous values.");
}

/** FormData-only wrappers for plain <form action={…}> usage. */
export async function archiveEmployeeForm(formData: FormData): Promise<void> {
  await archiveEmployee({ ok: false, error: "" }, formData);
}
export async function reactivateEmployeeForm(formData: FormData): Promise<void> {
  await reactivateEmployee({ ok: false, error: "" }, formData);
}
export async function archive201RecordForm(formData: FormData): Promise<void> {
  await archive201Record({ ok: false, error: "" }, formData);
}
