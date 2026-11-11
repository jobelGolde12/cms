import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { readMfaChallenge } from "@/lib/mfa";
import { MfaLoginForm } from "@/components/auth/mfa-login-form";
import { Logo } from "@/components/logo";

export const metadata = { title: "Two-factor verification · Records Management System" };

export default async function MfaLoginPage() {
  // No challenge row + cookie means the password step never happened — send
  // the visitor back to sign in. This is server-side, not a client guard.
  const challenge = await readMfaChallenge();
  if (!challenge) redirect("/login");
  if (!challenge.mfaEnabled) redirect("/login");

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
          <div className="mb-2 flex justify-center">
            <ShieldCheck aria-hidden="true" className="h-9 w-9 text-brand-700" />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-brand-950">
            Two-factor verification
          </h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Enter the 6-digit code from your authenticator app. You can use one
            of your recovery codes instead if the app is unavailable.
          </p>
        </div>

        <div className="rounded-[6px] border border-[#DCE4F0] bg-white px-6 py-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <MfaLoginForm />
        </div>
      </div>
    </main>
  );
}
