/**
 * Integration test: exercises the server-side PDF endpoints with a real
 * authenticated session (the same way the app serves downloads).
 *
 * Usage: npx tsx scripts/tmp/qa-pdf-endpoints.mts [baseUrl] [studentId]
 * Defaults: baseUrl=http://localhost:3000,
 *           studentId=910b7f32-d312-4794-b698-3f7686b124d2 (sample student)
 *
 * Requires a running dev/production server. Creates a temporary QA session
 * (`sms_session` cookie), requests both PDF routes, validates the responses,
 * then deletes the session again.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { hashToken } from "../../src/lib/auth";
import { sessions } from "../../src/db/schema";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const STUDENT_ID = process.argv[3] ?? "910b7f32-d312-4794-b698-3f7686b124d2";
const TOKEN = "qa-integration-session-token";

let failures = 0;
const check = (ok: boolean, label: string, info: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${info ? ` — ${info}` : ""}`);
  if (!ok) failures++;
};

try {
  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    tokenHash: hashToken(TOKEN),
    userId: "user-qa-integration",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  });

  const cookie = `sms_session=${TOKEN}`;

  type Case = { label: string; url: string; minBytes: number };
  const cases: Case[] = [
    {
      label: "GET /api/report-card/:id",
      url: `${BASE_URL}/api/report-card/${STUDENT_ID}`,
      minBytes: 10_000,
    },
    {
      label: "GET /api/form137/:id",
      url: `${BASE_URL}/api/form137/${STUDENT_ID}`,
      minBytes: 1_000,
    },
  ];

  for (const c of cases) {
    const res = await fetch(c.url, { headers: { Cookie: cookie }, redirect: "manual" });
    check(res.status === 200, `${c.label} → HTTP 200`, `status ${res.status}`);
    check(
      (res.headers.get("content-type") ?? "").startsWith("application/pdf"),
      `${c.label} → application/pdf`,
      `content-type ${res.headers.get("content-type")}`,
    );
    const buf = Buffer.from(await res.arrayBuffer());
    check(
      buf.subarray(0, 5).toString("latin1") === "%PDF-",
      `${c.label} → %PDF header`,
      `magic ${buf.subarray(0, 5).toString("latin1")}`,
    );
    check(buf.length > c.minBytes, `${c.label} → non-trivial size`, `${buf.length} bytes`);
    if (res.status !== 200) {
      console.log(`      body: ${buf.toString("utf8").slice(0, 300)}`);
    }
  }
} finally {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(TOKEN)));
}

console.log(failures === 0 ? "\nALL PDF ENDPOINT TESTS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
