import { and, asc, count, desc, eq, sql, sum, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  employee201Records,
  employees,
  serviceCreditTransactions,
  type Employee,
} from "@/db/schema";
import type {
  EmployeeStatus,
  ServiceCreditType,
} from "./constants";
import { EMPLOYEE_STATUSES } from "./constants";

/**
 * Employee-records queries — Admin Officer domain.
 *
 * These helpers are called only after `getAuthorizedUser`/`requirePermission`
 * gate the caller (route layer); they exist to keep the SQL in one place.
 * Every list query filters archived records by default so archived profiles
 * stay historical, not operational.
 */

export type EmployeeQuery = {
  q?: string;
  status?: string;
  employmentType?: string;
  appointmentStatus?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export type EmployeeListRow = {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  sex: string;
  position: string | null;
  appointmentStatus: string | null;
  employmentType: string | null;
  department: string | null;
  status: string;
  createdAt: Date;
};

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

function employeeFilters(query: EmployeeQuery): SQL | undefined {
  const conditions: SQL[] = [];
  if (query.q) {
    const needle = `%${query.q}%`;
    conditions.push(
      sql`(${employees.firstName} LIKE ${needle} OR ${employees.middleName} LIKE ${needle} OR ${employees.lastName} LIKE ${needle} OR ${employees.employeeNumber} LIKE ${needle} OR ${employees.position} LIKE ${needle})`,
    );
  }
  if (query.status) conditions.push(eq(employees.status, query.status as EmployeeStatus));
  if (query.employmentType)
    conditions.push(eq(employees.employmentType, query.employmentType));
  if (query.appointmentStatus)
    conditions.push(eq(employees.appointmentStatus, query.appointmentStatus));
  return conditions.length ? and(...conditions) : undefined;
}

export async function listEmployees(
  query: EmployeeQuery,
): Promise<{ rows: EmployeeListRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = ALLOWED_PAGE_SIZES.includes(query.pageSize as (typeof ALLOWED_PAGE_SIZES)[number])
    ? (query.pageSize as number)
    : DEFAULT_PAGE_SIZE;
  const where = employeeFilters(query) ?? sql`1 = 1`;

  const totalRow = await db.select({ n: count() }).from(employees).where(where);
  const total = totalRow[0]?.n ?? 0;

  const orderBy: SQL[] =
    query.sort === "name"
      ? [asc(employees.lastName), asc(employees.firstName)]
      : query.sort === "oldest"
        ? [asc(employees.createdAt)]
        : [desc(employees.createdAt)];

  const rows = await db
    .select({
      id: employees.id,
      employeeNumber: employees.employeeNumber,
      firstName: employees.firstName,
      middleName: employees.middleName,
      lastName: employees.lastName,
      suffix: employees.suffix,
      sex: employees.sex,
      position: employees.position,
      appointmentStatus: employees.appointmentStatus,
      employmentType: employees.employmentType,
      department: employees.department,
      status: employees.status,
      createdAt: employees.createdAt,
    })
    .from(employees)
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total, page, pageSize };
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const rows = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return rows[0] ?? null;
}

/* ------------------------------ 201 file --------------------------------- */

export type Employee201Row = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  recordDate: string;
  fileReference: string | null;
  isArchived: boolean;
  createdAt: Date;
};

export async function listEmployee201Records(
  employeeId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<Employee201Row[]> {
  const where = opts.includeArchived
    ? eq(employee201Records.employeeId, employeeId)
    : and(
        eq(employee201Records.employeeId, employeeId),
        eq(employee201Records.isArchived, false),
      );
  return db
    .select({
      id: employee201Records.id,
      category: employee201Records.category,
      title: employee201Records.title,
      description: employee201Records.description,
      recordDate: employee201Records.recordDate,
      fileReference: employee201Records.fileReference,
      isArchived: employee201Records.isArchived,
      createdAt: employee201Records.createdAt,
    })
    .from(employee201Records)
    .where(where)
    .orderBy(desc(employee201Records.recordDate), desc(employee201Records.createdAt));
}

/* ---------------------------- service credits ----------------------------- */

/* ------------------------------ validation -------------------------------- */

/**
 * Derived ledger balance: earned − consumed. Rounded to 2dp to keep floats
 * (6.5 + 0.1 style drift) out of comparisons.
 */
export function computeBalance(earned: number, consumed: number): number {
  return Math.round((earned - consumed) * 100) / 100;
}

/**
 * Balance rule for a consumed transaction: the available balance must cover
 * the amount (insert) or the projected corrected amount (edit). Earned
 * transactions are always allowed. Returns a user-facing error or null.
 */
export function validateCreditAmount(
  type: "earned" | "consumed",
  credits: number,
  availableBalance: number,
): string | null {
  if (credits <= 0) return "Credits must be greater than 0";
  if (type === "earned") return null;
  const balance = computeBalance(availableBalance, 0);
  if (credits > balance) {
    return `Insufficient service credits. Available balance is ${balance.toFixed(2)}.`;
  }
  return null;
}

export type ServiceCreditSummary = {
  earned: number;
  consumed: number;
  balance: number;
};

export type ServiceCreditTxRow = {
  id: string;
  employeeId: string;
  type: string;
  credits: number;
  transactionDate: string;
  reason: string;
  referenceDocument: string | null;
  remarks: string | null;
  createdBy: string;
  createdAt: Date;
};

/** Ledger-derived totals for one employee. Stored balances do not exist. */
export async function serviceCreditSummary(employeeId: string): Promise<ServiceCreditSummary> {
  const rows = await db
    .select({
      type: serviceCreditTransactions.type,
      total: sum(serviceCreditTransactions.credits),
    })
    .from(serviceCreditTransactions)
    .where(eq(serviceCreditTransactions.employeeId, employeeId))
    .groupBy(serviceCreditTransactions.type);

  const byType = (t: ServiceCreditType): number => {
    const row = rows.find((r) => r.type === t);
    return Number(row?.total ?? 0);
  };

  const earned = byType("earned");
  const consumed = byType("consumed");
  return {
    earned,
    consumed,
    balance: computeBalance(earned, consumed),
  };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Format + range check: a real calendar date, YYYY-MM-DD. */
function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  return (
    m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 9999
  );
}

/**
 * Pure ledger-row filter builder (exported for unit tests): type, inclusive
 * date range. Unrecognized values are dropped rather than trusted.
 */
export function serviceCreditTxConditions(
  employeeId: string,
  filters: ServiceCreditTxFilters,
): SQL[] {
  const conditions: SQL[] = [eq(serviceCreditTransactions.employeeId, employeeId)];
  if (filters.type === "earned" || filters.type === "consumed")
    conditions.push(eq(serviceCreditTransactions.type, filters.type));
  if (filters.from && isValidIsoDate(filters.from))
    conditions.push(sql`${serviceCreditTransactions.transactionDate} >= ${filters.from}`);
  if (filters.to && isValidIsoDate(filters.to))
    conditions.push(sql`${serviceCreditTransactions.transactionDate} <= ${filters.to}`);
  return conditions;
}

export type ServiceCreditTxFilters = {
  type?: string;
  /** Inclusive lower bound, ISO YYYY-MM-DD. */
  from?: string;
  /** Inclusive upper bound, ISO YYYY-MM-DD. */
  to?: string;
};

export type ServiceCreditTxPage = {
  rows: ServiceCreditTxRow[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Paginated transaction history for one employee. Filters are combined in a
 * single WHERE; count + page run as two queries on indexed columns.
 */
export async function listServiceCreditTransactions(
  employeeId: string,
  filters: ServiceCreditTxFilters & { page?: number; pageSize?: number } = {},
): Promise<ServiceCreditTxPage> {
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const pageSize = ALLOWED_PAGE_SIZES.includes(
    filters.pageSize as (typeof ALLOWED_PAGE_SIZES)[number],
  )
    ? (filters.pageSize as number)
    : DEFAULT_PAGE_SIZE;
  const conditions = serviceCreditTxConditions(employeeId, filters);
  const where = conditions.length ? and(...conditions) : undefined;

  const totalRow = await db
    .select({ n: count() })
    .from(serviceCreditTransactions)
    .where(where);
  const total = totalRow[0]?.n ?? 0;

  const rows = await db
    .select({
      id: serviceCreditTransactions.id,
      employeeId: serviceCreditTransactions.employeeId,
      type: serviceCreditTransactions.type,
      credits: serviceCreditTransactions.credits,
      transactionDate: serviceCreditTransactions.transactionDate,
      reason: serviceCreditTransactions.reason,
      referenceDocument: serviceCreditTransactions.referenceDocument,
      remarks: serviceCreditTransactions.remarks,
      createdBy: serviceCreditTransactions.createdBy,
      createdAt: serviceCreditTransactions.createdAt,
    })
    .from(serviceCreditTransactions)
    .where(where)
    .orderBy(desc(serviceCreditTransactions.transactionDate), desc(serviceCreditTransactions.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total, page, pageSize };
}

/** Per-employee summaries for the Service Credits overview page. */
export type ServiceCreditOverviewRow = EmployeeListRow & {
  earned: number;
  consumed: number;
  balance: number;
};

export type ServiceCreditOverviewQuery = {
  /** Free-text search across name fields, number, position, department, type, appointment. */
  q?: string;
  /** active | inactive | archived (validated) */
  status?: string;
  /** has_available | zero | negative */
  balanceStatus?: string;
  /** has_transactions | no_transactions */
  txStatus?: string;
  sort?: string;
  dir?: string;
  page?: number;
  pageSize?: number;
};

export type ServiceCreditOverviewPage = {
  rows: ServiceCreditOverviewRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Aggregates over the ENTIRE filtered dataset — stable across pages (Option A). */
  totals: { earned: number; consumed: number; available: number };
};

/**
 * Correlated per-employee ledger aggregates, rounded to 2dp in SQLite so the
 * SQL filters below agree with the application's `computeBalance` rounding.
 * Each expression stays inside its own query statement (no N+1 round-trips).
 *
 * Written as literal SQL on purpose: when a drizzle template is embedded in a
 * select field, drizzle strips table qualification from ${employees.id}, so
 * the correlated reference rendered as bare "id" and SQLite resolved it to
 * the inner table's own `id` column — silently zeroing every balance. The
 * unqualified inner columns (type, credits, employee_id) resolve to the
 * innermost scope (service_credit_transactions); the outer correlation is
 * fully qualified. Identifiers are fixed DB names — no interpolation needed.
 */
export const SERVICE_CREDIT_EARNED_SQL = sql<number>`coalesce((select round(sum(case when type = 'earned' then credits end), 2) from service_credit_transactions where employee_id = employees.id), 0)`;
export const SERVICE_CREDIT_CONSUMED_SQL = sql<number>`coalesce((select round(sum(case when type = 'consumed' then credits end), 2) from service_credit_transactions where employee_id = employees.id), 0)`;

const SERVICE_CREDIT_BALANCE_SQL = sql`(${SERVICE_CREDIT_EARNED_SQL} - ${SERVICE_CREDIT_CONSUMED_SQL})`;
const SERVICE_CREDIT_TX_COUNT_SQL = sql`(select count(*) from service_credit_transactions where employee_id = employees.id)`;

const SERVICE_CREDIT_SEARCH_COLUMNS = [
  employees.firstName,
  employees.middleName,
  employees.lastName,
  employees.suffix,
  employees.employeeNumber,
  employees.position,
  employees.designation,
  employees.department,
  employees.employmentType,
  employees.appointmentStatus,
];

/**
 * Pure overview filter builder (exported for unit tests). Unknown filter
 * values are ignored rather than trusted; the balance/transaction filters are
 * per-employee correlated aggregates so they can coexist in one WHERE.
 */
export function serviceCreditOverviewFilters(query: ServiceCreditOverviewQuery): SQL[] {
  const conditions: SQL[] = [];
  if (query.q) {
    const needle = `%${query.q}%`;
    conditions.push(
      sql`(${SERVICE_CREDIT_SEARCH_COLUMNS.map((col) => sql`${col} LIKE ${needle}`).reduce((a, b) => sql`${a} OR ${b}`)})`,
    );
  }
  if (query.status && EMPLOYEE_STATUSES.includes(query.status as EmployeeStatus))
    conditions.push(eq(employees.status, query.status as EmployeeStatus));
  if (query.balanceStatus === "has_available")
    conditions.push(sql`${SERVICE_CREDIT_BALANCE_SQL} > 0`);
  else if (query.balanceStatus === "zero")
    conditions.push(sql`${SERVICE_CREDIT_BALANCE_SQL} = 0`);
  else if (query.balanceStatus === "negative")
    conditions.push(sql`${SERVICE_CREDIT_BALANCE_SQL} < 0`);
  if (query.txStatus === "has_transactions")
    conditions.push(sql`${SERVICE_CREDIT_TX_COUNT_SQL} > 0`);
  else if (query.txStatus === "no_transactions")
    conditions.push(sql`${SERVICE_CREDIT_TX_COUNT_SQL} = 0`);
  return conditions;
}

const sortDir = (ascending: boolean) => (ascending ? asc : desc);

/**
 * Sort allowlist for the overview (exported for unit tests). Every branch
 * falls back deterministically so rankings stay stable between pages.
 */
export function serviceCreditOverviewSort(sort?: string, dir?: string): SQL[] {
  const isAsc = (dir ?? "").toLowerCase() === "asc";
  switch (sort) {
    case "employee_number":
      return [sortDir(isAsc)(employees.employeeNumber)];
    case "position":
      return [sortDir(isAsc)(employees.position), asc(employees.lastName), asc(employees.firstName)];
    case "status":
      return [sortDir(isAsc)(employees.status), asc(employees.lastName), asc(employees.firstName)];
    case "earned":
      return [sortDir(isAsc)(SERVICE_CREDIT_EARNED_SQL), asc(employees.lastName), asc(employees.firstName)];
    case "consumed":
      return [sortDir(isAsc)(SERVICE_CREDIT_CONSUMED_SQL), asc(employees.lastName), asc(employees.firstName)];
    case "balance":
      return [sortDir(isAsc)(SERVICE_CREDIT_BALANCE_SQL), asc(employees.lastName), asc(employees.firstName)];
    /* name (default) — lastName/firstName, and NULL positions last */
    default:
      return [sortDir(isAsc)(employees.lastName), sortDir(isAsc)(employees.firstName)];
  }
}

/**
 * Paginated Service Credits overview. Filters run against employees with
 * correlated aggregate subqueries so count, summary totals and the page rows
 * are always derived from identical conditions.
 * Summary totals intentionally cover the ENTIRE filtered dataset (Option A)
 * so the cards stay stable when the user pages through the table.
 */
export async function serviceCreditOverview(
  query: ServiceCreditOverviewQuery = {},
): Promise<ServiceCreditOverviewPage> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const pageSize = ALLOWED_PAGE_SIZES.includes(query.pageSize as (typeof ALLOWED_PAGE_SIZES)[number])
    ? (query.pageSize as number)
    : DEFAULT_PAGE_SIZE;
  const conditions = serviceCreditOverviewFilters(query);
  const where = conditions.length ? and(...conditions) : sql`1 = 1`;

  const [totalRow, totalsRow, rows] = await Promise.all([
    db.select({ n: count() }).from(employees).where(where),
    db
      .select({
        n: count(),
        earned: sql<number>`coalesce(sum(${SERVICE_CREDIT_EARNED_SQL}), 0)`,
        consumed: sql<number>`coalesce(sum(${SERVICE_CREDIT_CONSUMED_SQL}), 0)`,
      })
      .from(employees)
      .where(where),
    db
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        firstName: employees.firstName,
        middleName: employees.middleName,
        lastName: employees.lastName,
        suffix: employees.suffix,
        sex: employees.sex,
        position: employees.position,
        appointmentStatus: employees.appointmentStatus,
        employmentType: employees.employmentType,
        department: employees.department,
        status: employees.status,
        createdAt: employees.createdAt,
        earned: SERVICE_CREDIT_EARNED_SQL,
        consumed: SERVICE_CREDIT_CONSUMED_SQL,
      })
      .from(employees)
      .where(where)
      .orderBy(...serviceCreditOverviewSort(query.sort, query.dir))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const totalEarned = Math.round((Number(totalsRow[0]?.earned) || 0) * 100) / 100;
  const totalConsumed = Math.round((Number(totalsRow[0]?.consumed) || 0) * 100) / 100;

  return {
    page,
    pageSize,
    total: totalRow[0]?.n ?? 0,
    rows: rows.map((r) => ({
      ...r,
      earned: Number(r.earned) || 0,
      consumed: Number(r.consumed) || 0,
      balance: computeBalance(Number(r.earned) || 0, Number(r.consumed) || 0),
    })),
    totals: {
      earned: totalEarned,
      consumed: totalConsumed,
      available: computeBalance(totalEarned, totalConsumed),
    },
  };
}

/* ------------------------------ dashboard -------------------------------- */

export type OfficerDashboardData = {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  byEmploymentType: { label: string; value: number }[];
  byAppointmentStatus: { label: string; value: number }[];
  creditsEarned: number;
  creditsConsumed: number;
  creditsAvailable: number;
  recentEmployees: { id: string; fullName: string; employeeNumber: string; position: string | null; createdAt: Date }[];
  recentTransactions: (ServiceCreditTxRow & { employeeName: string; employeeNumber: string })[];
  incompleteProfiles: number;
};

export async function officerDashboardData(): Promise<OfficerDashboardData> {
  const [totals, byEmploymentType, byAppointmentStatus, credits, recent, recentTx, incomplete] =
    await Promise.all([
      db
        .select({
          n: count(),
          active: sql<number>`sum(case when ${employees.status} = 'active' then 1 else 0 end)`,
          inactive: sql<number>`sum(case when ${employees.status} = 'inactive' then 1 else 0 end)`,
        })
        .from(employees)
        .where(sql`${employees.status} != 'archived'`),
      db
        .select({ key: employees.employmentType, n: count() })
        .from(employees)
        .where(sql`${employees.status} = 'active'`)
        .groupBy(employees.employmentType),
      db
        .select({ key: employees.appointmentStatus, n: count() })
        .from(employees)
        .where(sql`${employees.status} = 'active'`)
        .groupBy(employees.appointmentStatus),
      db
        .select({
          type: serviceCreditTransactions.type,
          total: sum(serviceCreditTransactions.credits),
        })
        .from(serviceCreditTransactions),
      db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          employeeNumber: employees.employeeNumber,
          position: employees.position,
          createdAt: employees.createdAt,
        })
        .from(employees)
        .orderBy(desc(employees.createdAt))
        .limit(5),
      db
        .select({
          id: serviceCreditTransactions.id,
          employeeId: serviceCreditTransactions.employeeId,
          type: serviceCreditTransactions.type,
          credits: serviceCreditTransactions.credits,
          transactionDate: serviceCreditTransactions.transactionDate,
          reason: serviceCreditTransactions.reason,
          referenceDocument: serviceCreditTransactions.referenceDocument,
          remarks: serviceCreditTransactions.remarks,
          createdBy: serviceCreditTransactions.createdBy,
          createdAt: serviceCreditTransactions.createdAt,
          firstName: employees.firstName,
          lastName: employees.lastName,
          employeeNumber: employees.employeeNumber,
        })
        .from(serviceCreditTransactions)
        .innerJoin(employees, eq(employees.id, serviceCreditTransactions.employeeId))
        .orderBy(desc(serviceCreditTransactions.createdAt))
        .limit(6),
      db
        .select({ n: count() })
        .from(employees)
        .where(
          and(
            sql`${employees.status} = 'active'`,
            sql`(${employees.position} IS NULL OR ${employees.appointmentStatus} IS NULL OR ${employees.employmentType} IS NULL OR ${employees.dateHired} IS NULL)`,
          ),
        ),
    ]);

  const earned =
    Number(credits.find((r) => r.type === "earned")?.total ?? 0) || 0;
  const consumed =
    Number(credits.find((r) => r.type === "consumed")?.total ?? 0) || 0;

  return {
    totalEmployees: Number(totals[0]?.n ?? 0) || 0,
    activeEmployees: Number(totals[0]?.active ?? 0) || 0,
    inactiveEmployees: Number(totals[0]?.inactive ?? 0) || 0,
    byEmploymentType: byEmploymentType.map((r) => ({ label: r.key ?? "Unspecified", value: r.n })),
    byAppointmentStatus: byAppointmentStatus.map((r) => ({
      label: r.key ?? "Unspecified",
      value: r.n,
    })),
    creditsEarned: earned,
    creditsConsumed: consumed,
    creditsAvailable: Math.round((earned - consumed) * 100) / 100,
    recentEmployees: recent.map((r) => ({
      id: r.id,
      fullName: `${r.firstName} ${r.lastName}`.trim(),
      employeeNumber: r.employeeNumber,
      position: r.position,
      createdAt: r.createdAt,
    })),
    recentTransactions: recentTx.map((tx) => ({
      id: tx.id,
      employeeId: tx.employeeId,
      type: tx.type,
      credits: tx.credits,
      transactionDate: tx.transactionDate,
      reason: tx.reason,
      referenceDocument: tx.referenceDocument,
      remarks: tx.remarks,
      createdBy: tx.createdBy,
      createdAt: tx.createdAt,
      employeeName: `${tx.firstName} ${tx.lastName}`.trim(),
      employeeNumber: tx.employeeNumber,
    })),
    incompleteProfiles: Number(incomplete[0]?.n ?? 0) || 0,
  };
}

/** Registry stats for /employees header + KPI grid. */
export async function employeeRegistryStats() {
  const rows = await db
    .select({
      status: employees.status,
      n: count(),
    })
    .from(employees)
    .groupBy(employees.status);

  const by = (s: EmployeeStatus): number => Number(rows.find((r) => r.status === s)?.n ?? 0) || 0;
  const active = by("active");
  const inactive = by("inactive");
  const archived = by("archived");
  return {
    total: active + inactive + archived,
    active,
    inactive,
    archived,
  };
}
