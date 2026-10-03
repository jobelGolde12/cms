import Link from "next/link";
import { ShieldCheck, ShieldX, Clock } from "lucide-react";
import { resolveQrToken, registerQrScan } from "@/lib/qr";
import { db } from "@/db";
import { children } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buttonStyles } from "@/components/ui/button";

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

  const banner = invalid
    ? { icon: ShieldX, bg: "bg-status-error-bg", ring: "border-red-200", fg: "text-status-error" }
    : resolved?.expired
      ? { icon: Clock, bg: "bg-status-pending-bg", ring: "border-amber-200", fg: "text-status-pending" }
      : { icon: ShieldCheck, bg: "bg-status-verified-bg", ring: "border-emerald-200", fg: "text-status-verified" };
  const BannerIcon = banner.icon;

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md rounded-[3px] border border-brand-200 bg-white p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
        <div
          aria-hidden="true"
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[3px] border ${banner.ring} ${banner.bg}`}
        >
          <BannerIcon className={`h-7 w-7 ${banner.fg}`} />
        </div>

        {invalid ? (
          <>
            <h1 className="text-xl font-bold tracking-tight text-brand-900">Record not found</h1>
            <p className="mt-2 text-sm leading-relaxed text-brand-500">
              This verification link is invalid or has been revoked. Please check with the
              Municipal Social Welfare Office.
            </p>
          </>
        ) : resolved?.expired ? (
          <>
            <h1 className="text-xl font-bold tracking-tight text-brand-900">Verification link expired</h1>
            <p className="mt-2 text-sm leading-relaxed text-brand-500">
              This QR code has expired. Request a new one from the municipal office.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold tracking-tight text-brand-900">Record verified</h1>
            <p className="mt-2 text-sm leading-relaxed text-brand-600">
              This child record is <strong>registered and verified</strong> in the Municipal
              Child Mapping System of Sta. Magdalena, Sorsogon.
            </p>
            <dl className="mt-5 space-y-2 rounded-[3px] border border-brand-100 bg-brand-50 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-brand-500">Reference code</dt>
                <dd className="numeric font-medium text-brand-900">{child!.childCode}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brand-500">Record status</dt>
                <dd className="font-medium text-status-verified">Verified</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-brand-400">
              For privacy, only the reference code and status are shown. Personal details are
              never encoded in QR codes.
            </p>
          </>
        )}

        <Link href="/verify" className={`mt-6 ${buttonStyles("secondary", "md")}`}>
          Verify another code
        </Link>
      </div>
    </main>
  );
}
