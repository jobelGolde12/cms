import Link from "next/link";
import { ShieldCheck, ShieldX, Clock } from "lucide-react";
import { resolveQrToken, registerQrScan } from "@/lib/qr";
import { db } from "@/db";
import { children } from "@/db/schema";
import { eq } from "drizzle-orm";
import { maskName } from "@/lib/utils";

export const metadata = { title: "Record Verification — Sta. Magdalena CMS" };

export default async function VerifyTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const resolved = await resolveQrToken(token).catch(() => null);

  let child: { childCode: string; firstName: string; recordStatus: string } | null = null;
  if (resolved && !resolved.expired) {
    const rows = await db
      .select({
        childCode: children.childCode,
        firstName: children.firstName,
        lastName: children.lastName,
        recordStatus: children.recordStatus,
      })
      .from(children)
      .where(eq(children.id, resolved.childId))
      .limit(1);
    const row = rows[0];
    if (row && row.recordStatus === "verified") {
      child = { childCode: row.childCode, firstName: row.firstName, recordStatus: row.recordStatus };
    }
    // Record the scan event (no personal data in logs beyond token reference).
    await registerQrScan(token).catch(() => undefined);
  }

  const invalid = !resolved || (!child && !resolved.expired);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-200 bg-white shadow-xl p-8 text-center">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md ${
            invalid ? "bg-red-700" : resolved?.expired ? "bg-amber-600" : "bg-brand-900"
          }`}
        >
          {invalid ? (
            <ShieldX className="h-7 w-7" />
          ) : resolved?.expired ? (
            <Clock className="h-7 w-7" />
          ) : (
            <ShieldCheck className="h-7 w-7" />
          )}
        </div>

        {invalid ? (
          <>
            <h1 className="text-xl font-extrabold text-brand-900">Record not found</h1>
            <p className="mt-2 text-sm text-brand-500">
              This verification link is invalid or has been revoked. Please check with the
              Municipal Social Welfare Office.
            </p>
          </>
        ) : resolved?.expired ? (
          <>
            <h1 className="text-xl font-extrabold text-brand-900">Verification link expired</h1>
            <p className="mt-2 text-sm text-brand-500">
              This QR code has expired. Request a new one from the municipal office.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-extrabold text-brand-900">Record verified</h1>
            <p className="mt-2 text-sm text-brand-600">
              This child record is <strong>registered and verified</strong> in the Municipal
              Child Mapping System of Sta. Magdalena, Sorsogon.
            </p>
            <dl className="mt-5 space-y-2 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-brand-500">Reference code</dt>
                <dd className="font-mono text-brand-900">{child!.childCode}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brand-500">Record status</dt>
                <dd className="font-medium text-emerald-700">Verified</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-brand-400">
              For privacy, only the reference code and status are shown. Personal details are
              never encoded in QR codes.
            </p>
          </>
        )}

        <Link
          href="/verify"
          className="mt-6 inline-block rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
        >
          Verify another code
        </Link>
      </div>
    </main>
  );
}
