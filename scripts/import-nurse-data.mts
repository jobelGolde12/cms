/**
 * Import Nurse dATA.xlsx (51 baseline nutritional assessments, Grade 12 - HESTIA,
 * SY 2026-2027) into the **Turso** production database.
 *
 * Turso-only guard: refuses to run unless TURSO_DATABASE_URL is a remote
 * libsql:// URL — the import must never touch a local SQLite file.
 *
 * Logic mirrors scripts/import-nurse-data.py (the original local-DB import),
 * with stricter matching (first-name token + birthday + sex), full
 * pre-validation of all 51 records before any write, an atomic batch write,
 * and post-import verification against the expected summary totals.
 *
 * Run: npx tsx scripts/import-nurse-data.mts          (dry-run)
 *      npx tsx scripts/import-nurse-data.mts --apply  (write)
 */
import { createClient, type InValue } from "@libsql/client";
import { config } from "dotenv";

// Next.js-style precedence: .env first, .env.local overrides.
config({ path: ".env", override: false });
config({ path: ".env.local", override: true });

const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "";
if (!url.startsWith("libsql://")) {
  console.error(
    "Refusing to run: TURSO_DATABASE_URL is not a remote libsql:// URL. " +
      "This import must only target the Turso database, never a local file.",
  );
  process.exit(2);
}
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const q = async <T,>(sql: string, args?: InValue[]): Promise<T[]> =>
  (await client.execute({ sql, args })).rows as unknown as T[];

const ExcelJS = (await import("exceljs")).default;

/* ------------------------------------------------------------------ */
/* Types + parsing helpers                                             */
/* ------------------------------------------------------------------ */

type ParseRow = {
  sheetRow: number; // worksheet row number
  name: string;
  firstName: string;
  lastName: string;
  birth: string | null;
  weightKg: number | null;
  heightCm: number | null;
  sex: "male" | "female" | null;
  bmi: number | null;
  nutritionalStatus: string | null;
  heightForAge: string | null;
};

const NUTRITIONAL_STATUSES = ["normal", "wasted", "severely_wasted", "overweight", "obese"];
const HFA_STATUSES = ["normal", "stunted", "severely_stunted", "tall"];

function cleanStatus(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const map: Record<string, string> = {
    Normal: "normal",
    Wasted: "wasted",
    "Severely Wasted": "severely_wasted",
    "Severely  Wasted": "severely_wasted",
    Overweight: "overweight",
    Obese: "obese",
  };
  return map[s] ?? s.toLowerCase().replace(/ /g, "_");
}

function cleanHfa(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const map: Record<string, string> = {
    Normal: "normal",
    Stunted: "stunted",
    "Severely Stunted": "severely_stunted",
    Tall: "tall",
  };
  return map[s] ?? s.toLowerCase().replace(/ /g, "_");
}

/**
 * Unwrap exceljs cell values: formula cells come back as { formula, result }
 * (mirrors openpyxl's data_only=True). String cells may also be {richText}.
 */
function cellValue(v: unknown): unknown {
  if (v == null || typeof v !== "object") return v;
  const obj = v as Record<string, unknown>;
  if ("result" in obj && obj.result !== undefined) return obj.result;
  if (Array.isArray(obj.richText)) {
    return (obj.richText as Array<{ text?: string }>)
      .map((part) => part.text ?? "")
      .join("");
  }
  if (typeof obj.text === "string") return obj.text;
  return v;
}

function toIsoDate(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s || s === "-") return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/** "Cornelio ,Zoilo" / "Fresnido, Bryan F." / "Garbin, Jolix" / "Maria Lopez" */
function splitName(nameRaw: string): { firstName: string; lastName: string } {
  if (nameRaw.includes(",")) {
    const [lastRaw, ...rest] = nameRaw.split(",");
    return { firstName: (rest.join(",") || "").trim(), lastName: lastRaw.trim() };
  }
  const parts = nameRaw.trim().split(/\s+/);
  const firstName = parts[0];
  return { firstName, lastName: parts.length > 1 ? parts.slice(1).join(" ") : "" };
}

/** Normalized first token for matching ("Bryan F." -> "bryan"). */
function firstToken(name: string): string {
  return (name.trim().toLowerCase().replace(/\.$/, "").split(/\s+/)[0] ?? "").replace(/[^a-z]/g, "");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const MEASUREMENT_DATE = "2026-06-10"; // Dataset: Date of Weighing 06/10/2026
const REMARKS = "Baseline nutritional assessment — School Year 2026-2027, Section HESTIA";
const NOW = Math.floor(Date.now() / 1000);
const EXPECTED_TOTALS = {
  total: 51,
  male: 14,
  female: 37,
  nutritional: { severely_wasted: 2, wasted: 7, normal: 42, overweight: 0, obese: 0 },
  hfa: { severely_stunted: 2, stunted: 13, normal: 36, tall: 0 },
};

/* ------------------------------------------------------------------ */
/* 1. Parse + validate the workbook BEFORE touching the database       */
/* ------------------------------------------------------------------ */

const wb = await new ExcelJS.Workbook().xlsx.readFile("Nurse dATA.xlsx");
const ws = wb.getWorksheet("12 - HESTIA");
if (!ws) {
  console.error("Sheet '12 - HESTIA' not found.");
  process.exit(1);
}

const parsed: ParseRow[] = [];
const problems: string[] = [];

for (let r = 9; r <= ws.rowCount; r++) {
  const raw = (ws.getRow(r).values ?? []) as unknown[]; // index n = column n (1-based)
  const vals = raw.map((v) => cellValue(v));
  const numberCell = vals[1]; // col A
  const nameRaw = vals[3]; // col C

  if (!nameRaw || typeof nameRaw !== "string" || !nameRaw.trim()) continue;
  const name = String(nameRaw);
  if (name.startsWith("Body") || name.startsWith("No.")) continue; // reference rows
  if (name.includes("Mass")) continue; // BMI reference rows
  // Mirror the Python guard: skip rows whose number cell is empty or a stray '.'.
  if (numberCell == null) continue;
  if (typeof numberCell === "string" && numberCell.trim() === ".") continue;

  const { firstName, lastName } = splitName(name.trim());
  const sex = vals[7] === "M" ? "male" : vals[7] === "F" ? "female" : null;
  const status = cleanStatus(vals[13]);
  const hfa = cleanHfa(vals[14]);
  const weightKg = toNumber(vals[5]);
  const heightM = toNumber(vals[6]);
  const bmi = toNumber(vals[12]);
  const birth = toIsoDate(vals[4]);

  const row: ParseRow = {
    sheetRow: r,
    name: name.trim(),
    firstName,
    lastName,
    birth,
    weightKg: weightKg != null ? round2(weightKg) : null,
    heightCm: heightM != null ? round2(heightM * 100) : null,
    sex,
    bmi: bmi != null ? round2(bmi) : null,
    nutritionalStatus: status,
    heightForAge: hfa,
  };

  if (sex == null) problems.push(`row ${r}: unrecognized sex ${JSON.stringify(vals[7])}`);
  if (status && !NUTRITIONAL_STATUSES.includes(status))
    problems.push(`row ${r} ${name}: unknown nutritional status "${status}"`);
  if (hfa && !HFA_STATUSES.includes(hfa)) problems.push(`row ${r} ${name}: unknown height-for-age "${hfa}"`);
  if (birth == null) problems.push(`row ${r} ${name}: unparseable birth date ${JSON.stringify(vals[4])}`);
  if (weightKg == null || weightKg < 10 || weightKg > 200)
    problems.push(`row ${r} ${name}: unreasonable weight ${String(vals[5])}`);
  if (heightM == null || heightM < 0.8 || heightM > 2.2)
    problems.push(`row ${r} ${name}: unreasonable height ${String(vals[6])}`);
  if (bmi != null && (bmi < 10 || bmi > 50)) problems.push(`row ${r} ${name}: unreasonable BMI ${String(vals[12])}`);
  if (firstName === "" || lastName === "") problems.push(`row ${r} ${name}: unparseable name`);

  parsed.push(row);
}

// Duplicate check inside the spreadsheet itself (same last+first token+birthday).
const sheetKey = new Map<string, string>();
for (const p of parsed) {
  const key = `${firstToken(p.firstName)}|${p.lastName.toLowerCase()}|${p.birth}`;
  if (sheetKey.has(key)) problems.push(`duplicate row in spreadsheet: ${p.name} (${p.birth})`);
  sheetKey.set(key, p.name);
}

if (parsed.length !== EXPECTED_TOTALS.total || problems.length > 0) {
  console.error(
    `ABORT: parsed ${parsed.length} student rows, expected ${EXPECTED_TOTALS.total}; ` +
      `${problems.length} validation problem(s). No changes written.`,
  );
  for (const p of problems) console.error(" -", p);
  process.exit(1);
}

const parseNutri: Record<string, number> = {};
const parseHfa: Record<string, number> = {};
let parseMale = 0;
let parseFemale = 0;
for (const p of parsed) {
  if (p.sex === "male") parseMale++;
  else parseFemale++;
  parseNutri[p.nutritionalStatus ?? "(none)"] = (parseNutri[p.nutritionalStatus ?? "(none)"] ?? 0) + 1;
  parseHfa[p.heightForAge ?? "(none)"] = (parseHfa[p.heightForAge ?? "(none)"] ?? 0) + 1;
}
console.log("Parsed 51 records. In-sheet totals:");
console.log(" nutritional status:", JSON.stringify(parseNutri));
console.log(" height-for-age:    ", JSON.stringify(parseHfa));
console.log(" male/female:       ", `${parseMale}/${parseFemale}`);

/* ------------------------------------------------------------------ */
/* 2. Verify reference entities in Turso                               */
/* ------------------------------------------------------------------ */

const grade = await q<{ id: string }>("SELECT id FROM grade_levels WHERE name = 'Grade 12'");
const sy = await q<{ id: string }>("SELECT id FROM school_years WHERE year = '2026-2027'");
const section = await q<{ id: string; name: string }>(
  "SELECT id, name FROM sections WHERE grade_level_id = 'gl-12' AND school_year_id = 'sy-2026-2027'",
);
const nurseUser = await q<{ id: string }>("SELECT id FROM users WHERE id = 'user-nurse'");

if (grade.length !== 1 || sy.length !== 1 || section.length !== 1 || nurseUser.length !== 1) {
  console.error(
    `ABORT: reference rows missing in Turso (grade=${grade.length}, sy=${sy.length}, ` +
      `section=${section.length}, nurseUser=${nurseUser.length}). No changes written.`,
  );
  process.exit(1);
}
const gradeId = grade[0].id;
const syId = sy[0].id;
const sectionId = section[0].id;
const recordedBy = nurseUser[0].id;
console.log(`Reference rows: ${gradeId} / ${syId} / ${sectionId} ("${section[0].name}") / recorder ${recordedBy}`);

/* ------------------------------------------------------------------ */
/* 3. Match students against existing Turso records                    */
/* ------------------------------------------------------------------ */

type StudentRow = { id: string; first_name: string; last_name: string; birth_date: string | null; sex: string };
const existing = await q<StudentRow>("SELECT id, first_name, last_name, birth_date, sex FROM students");

const byLastName = new Map<string, StudentRow[]>();
for (const s of existing) {
  const key = s.last_name.trim().toLowerCase();
  const list = byLastName.get(key);
  if (list) list.push(s);
  else byLastName.set(key, [s]);
}

const notes: string[] = [];
type Plan = { row: ParseRow; mode: "existing" | "create"; existingId?: string };
const plans: Plan[] = [];

for (const p of parsed) {
  const candidates = byLastName.get(p.lastName.toLowerCase()) ?? [];
  let matched: StudentRow | undefined;
  for (const c of candidates) {
    if (c.sex !== p.sex) continue;
    if (firstToken(c.first_name) !== firstToken(p.firstName)) continue;
    if (c.birth_date == null && p.birth == null) {
      notes.push(`matched on name+sex only (no birthday on either side): ${p.name} -> ${c.id}`);
      matched = c;
      break;
    }
    if (c.birth_date != null && p.birth != null && c.birth_date === p.birth) {
      matched = c;
      break;
    }
    if (c.birth_date == null) {
      notes.push(`existing student ${c.id} (${c.first_name} ${c.last_name}) has no birthday; cannot confirm match for ${p.name}`);
    }
  }

  if (matched) {
    if (matched.birth_date != null && p.birth != null && matched.birth_date !== p.birth) {
      // Not reachable with the branch order above, but kept as a safety net.
      plans.push({ row: p, mode: "create" });
    } else {
      plans.push({ row: p, mode: "existing", existingId: matched.id });
    }
  } else {
    plans.push({ row: p, mode: "create" });
  }
}

const reused = plans.filter((p) => p.mode === "existing");
const toCreate = plans.filter((p) => p.mode === "create");
console.log(`Match result: ${existing.length} students already in DB — ${reused.length} matched, ${toCreate.length} to create.`);
for (const m of reused) console.log(`  matched: ${m.row.name} -> ${m.existingId}`);

// Idempotency: skip enrollments / health records that already exist.
const existingEnrollments = new Set(
  (
    await q<{ student_id: string; school_year_id: string }>(
      "SELECT student_id, school_year_id FROM student_enrollments",
    )
  ).map((r) => `${r.student_id}|${r.school_year_id}`),
);
const existingHealth = new Set(
  (
    await q<{ student_id: string; measurement_date: string }>(
      "SELECT student_id, measurement_date FROM health_records",
    )
  ).map((r) => `${r.student_id}|${r.measurement_date}`),
);

/* ------------------------------------------------------------------ */
/* 4. Build + execute the write batch (atomic)                         */
/* ------------------------------------------------------------------ */

if (!process.argv.includes("--apply")) {
  console.log("DRY-RUN: nothing written. Re-run with --apply to import.");
  if (notes.length > 0) {
    console.log("notes:");
    for (const n of notes) console.log(" -", n);
  }
  process.exit(0);
}

const seq = new Map<string, number>(); // plan index -> import sequence number
let nextSeq = 1;

const stmts: Array<{ sql: string; args: InValue[]; skip?: boolean }> = [];
plans.forEach((plan, i) => {
  const p = plan.row;
  const n = String(nextSeq).padStart(3, "0");
  seq.set(String(i), nextSeq);
  nextSeq += 1;

  let studentId: string;
  if (plan.mode === "existing" && plan.existingId) {
    studentId = plan.existingId;
  } else {
    studentId = `student-hestia-${n}`;
    stmts.push({
      sql:
        `INSERT INTO students (id, student_number, lrn, first_name, middle_name, last_name, birth_date, sex, ` +
        `status, record_status, created_by, updated_by, created_at, updated_at) ` +
        `VALUES (?, ?, NULL, ?, NULL, ?, ?, ?, 'active', 'draft', ?, NULL, ?, ?)`,
      args: [studentId, `SM-HE-2026-${n}`, p.firstName, p.lastName, p.birth, p.sex, recordedBy, NOW, NOW],
    });
  }

  stmts.push({
    sql:
      `INSERT INTO student_enrollments (id, student_id, school_year_id, grade_level_id, section_id, ` +
      `status, recorded_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    args: [`enroll-hestia-${n}`, studentId, syId, gradeId, sectionId, recordedBy, NOW, NOW],
    skip: existingEnrollments.has(`${studentId}|${syId}`),
  });

  stmts.push({
    sql:
      `INSERT INTO health_records (id, student_id, school_year_id, measurement_date, weight_kg, height_cm, ` +
      `bmi, nutritional_status, height_for_age, remarks, recorded_by, created_at, updated_at) ` +
      `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      `health-hestia-${n}`,
      studentId,
      syId,
      MEASUREMENT_DATE,
      p.weightKg,
      p.heightCm,
      p.bmi,
      p.nutritionalStatus,
      p.heightForAge,
      REMARKS,
      recordedBy,
      NOW,
      NOW,
    ],
    skip: existingHealth.has(`${studentId}|${MEASUREMENT_DATE}`),
  });
});

const writable = stmts.filter((s) => !s.skip);
if (writable.length < stmts.length) {
  console.log(`Skipping ${stmts.length - writable.length} already-existing enrollment/health statements (idempotent re-run).`);
}
if (writable.length > 0) {
  await client.batch(writable, "write");
}
console.log(`Wrote ${writable.length} statements.`);

/* ------------------------------------------------------------------ */
/* 5. Post-import verification against the expected summary totals     */
/* ------------------------------------------------------------------ */

const verifyWhere = `WHERE measurement_date = '${MEASUREMENT_DATE}' AND school_year_id = '${syId}'`;const nutriRows = await q<{ s: string | null; n: number }>(
  `SELECT nutritional_status AS s, COUNT(*) AS n FROM health_records ${verifyWhere} GROUP BY nutritional_status`,
);
const hfaRows = await q<{ s: string | null; n: number }>(
  `SELECT height_for_age AS s, COUNT(*) AS n FROM health_records ${verifyWhere} GROUP BY height_for_age`,
);
const sexRows = await q<{ s: string | null; n: number }>(
  `SELECT st.sex AS s, COUNT(*) AS n FROM health_records h JOIN students st ON st.id = h.student_id ${verifyWhere} GROUP BY st.sex`,
);

const nutriMap = Object.fromEntries(nutriRows.map((r) => [r.s ?? "(none)", Number(r.n)]));
const hfaMap = Object.fromEntries(hfaRows.map((r) => [r.s ?? "(none)", Number(r.n)]));
const sexMap = Object.fromEntries(sexRows.map((r) => [r.s ?? "(none)", Number(r.n)]));

const fail: string[] = [];
const check = (label: string, got: number | undefined, want: number) => {
  if ((got ?? 0) !== want) fail.push(`${label}: got ${got ?? 0}, expected ${want}`);
};
for (const [k, v] of Object.entries(EXPECTED_TOTALS.nutritional)) check(`nutritional ${k}`, nutriMap[k], v);
for (const [k, v] of Object.entries(EXPECTED_TOTALS.hfa)) check(`hfa ${k}`, hfaMap[k], v);
check("male", sexMap["male"], EXPECTED_TOTALS.male);
check("female", sexMap["female"], EXPECTED_TOTALS.female);
check("total nutritional", Object.values(nutriMap).reduce((a, b) => a + b, 0), EXPECTED_TOTALS.total);
check("total height-for-age", Object.values(hfaMap).reduce((a, b) => a + b, 0), EXPECTED_TOTALS.total);
check("total by sex", Object.values(sexMap).reduce((a, b) => a + b, 0), EXPECTED_TOTALS.total);

console.log("=== POST-IMPORT VERIFICATION (Turso) ===");
console.log("nutritional:", JSON.stringify(nutriMap));
console.log("hfa:        ", JSON.stringify(hfaMap));
console.log("sex:        ", JSON.stringify(sexMap));
if (fail.length > 0) {
  console.error(`FAIL: ${fail.length} verification problem(s):`);
  for (const f of fail) console.error(" -", f);
  process.exit(1);
}
console.log("All totals match the expected baseline summary.");
if (notes.length > 0) {
  console.log("notes:");
  for (const n of notes) console.log(" -", n);
}
