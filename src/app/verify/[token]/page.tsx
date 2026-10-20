import Link from "next/link";
import { ShieldCheck, ShieldX, Clock } from "lucide-react";
import { resolveQrToken, registerQrScan } from "@/lib/qr";
import { verifyTokenSchema } from "@/lib/schemas";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buttonStyles } from "@/components/ui/button";

export const metadata = { title: "Record Verification — Sta. Magdalena NHS" };

export default async function VerifyTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const validatedToken = verifyTokenSchema.safeParse({ token: decodeURIComponent(token) });
  if (!validatedToken.success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
        <div className="w-full max-w-md rounded-[3px] border border-brand-200 bg-white p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          <div aria-hidden="true" className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[3px] border border-red-200 bg-status-error-bg">
            <ShieldX className="h-7 w-7 text-status-error" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-brand-900">Invalid token format</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            The verification token contains invalid characters or is too short. Please check the QR code and try again.
          </p>
          <Link href="/verify" className={`mt-6 inline-flex h-10 items-center gap-1.5 rounded-[3px] border border-brand-300 bg-white px-4 text-[13px] font-semibold text-brand-950 transition-colors hover:bg-brand-50`}>
            Verify another code
          </Link>
        </div>
      </main>
    );
  }
  const cleanToken = validatedToken.data.token;

  const resolved = await resolveQrToken(cleanToken).catch(() => null);

  let student: { studentNumber: string; firstName: string; recordStatus: string } | null = null;
  if (resolved && !resolved.expired) {
    const rows = await db
      .select({
        studentNumber: students.studentNumber,
        firstName: students.firstName,
        lastName: students.lastName,
        recordStatus: students.recordStatus,
      })
      .from(students)
      .where(eq(students.id, resolved.studentId))
      .limit(1);
    const row = rows[0];
    if (row && row.recordStatus === "verified") {
      student = {
        studentNumber: row.studentNumber,
        firstName: row.firstName,
        recordStatus: row.recordStatus,
      };
    }
    // Record the scan event (no personal data in logs beyond token reference).
    await registerQrScan(cleanToken).catch(() => undefined);
  }

  const invalid = !resolved || (!student && !resolved.expired);

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
            <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
              This verification link is invalid or has been revoked. Please check with the
              school registrar.
            </p>
          </>
        ) : resolved?.expired ? (
          <>
            <h1 className="text-xl font-bold tracking-tight text-brand-900">Verification link expired</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
              This QR code has expired. Request a new one from the school registrar.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold tracking-tight text-brand-900">Record verified</h1>
            <p className="mt-2 text-sm leading-relaxed text-brand-600">
              This student record is <strong>registered and verified</strong> in the Records
              Management System of Sta. Magdalena National High School.
            </p>
            <dl className="mt-5 space-y-2 rounded-[3px] border border-brand-100 bg-brand-50 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#64748B]">Student number</dt>
                <dd className="numeric font-medium text-brand-900">{student!.studentNumber}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#64748B]">Record status</dt>
                <dd className="font-medium text-status-verified">Verified</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-brand-400">
              For privacy, only the student number and status are shown. Personal details are
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
