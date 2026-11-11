import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";
import { AlertTriangle } from "lucide-react";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";
import { isValidTokenShape, sha256Hex } from "@/lib/security/tokens";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonStyles } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export const metadata = { title: "Reset password · Records Management System" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawToken = typeof sp.token === "string" ? sp.token.trim() : "";
  const token = isValidTokenShape(rawToken) ? rawToken : "";

  let valid = false;
  if (token) {
    try {
      const rows = await db
        .select({ id: passwordResetTokens.id })
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, sha256Hex(token)),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, new Date()),
          ),
        )
        .limit(1);
      valid = rows.length === 1;
    } catch (error) {
      console.error("[reset-password] token lookup failed", error);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F4F7FC]">
      <header className="border-b border-[#DCE4F0] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-3 md:px-10 lg:px-16">
          <Logo size="lg" asLink priority />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-brand-900">
              Republic of the Philippines
            </p>
            <p className="truncate text-[10px] font-medium text-[#64748B]">
              STA. MAGDALENA NHS • DEPED SORSOGON DIVISION
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-5 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-brand-950">
            Choose a new password
          </h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Reset links are single-use and expire after 30 minutes. Signing in
            everywhere else will be required again.
          </p>
        </div>

        <div className="rounded-[6px] border border-[#DCE4F0] bg-white px-6 py-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          {valid ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div role="alert" className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle aria-hidden="true" className="h-9 w-9 text-amber-600" />
              <p className="text-sm font-medium text-brand-900">
                This reset link is invalid, already used, or has expired.
              </p>
              <Link href="/forgot-password" className={buttonStyles("secondary", "md")}>
                Request a new link
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
