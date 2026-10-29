"use client";

import { useActionState, useId, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

type LoginState = Awaited<ReturnType<typeof login>>;

const INITIAL_STATE: LoginState = { ok: false, error: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const emailHintId = useId();

  const hasError = state.ok === false && Boolean(state.error);

  return (
    <main className="flex min-h-screen flex-col bg-[#F4F7FC]">
      {/* Institutional Header */}
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

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-5 py-10 sm:px-6 sm:py-14 lg:py-16">
        {/* Title Area */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] text-brand-950 sm:text-[2rem]">
            Sta. Magdalena NHS
          </h1>
          <p className="mt-1 text-base font-normal tracking-[-0.01em] text-brand-800">
            Records Management System
          </p>
          <p className="mt-3 text-xs text-[#64748B]">
            Authorized school personnel only.
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full rounded-[6px] border border-[#DCE4F0] bg-white px-6 py-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:px-8 sm:py-8">
          <form action={formAction} className="space-y-5" noValidate>
            {hasError ? (
              <div
                id={errorId}
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-[4px] border border-red-200 bg-[#FEF2F2] px-3.5 py-3 text-sm font-medium text-red-800"
              >
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span className="leading-snug">{state.error}</span>
              </div>
            ) : null}

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={emailId}
                className="block text-sm font-semibold text-brand-900"
              >
                DepEd Email
              </label>
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="j.delacruz@deped.gov.ph"
                required
                aria-invalid={hasError || undefined}
                aria-describedby={
                  hasError ? `${emailHintId} ${errorId}` : emailHintId
                }
                className="h-11 w-full rounded-[4px] border border-[#DCE4F0] bg-white px-3.5 text-sm text-brand-950 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] placeholder:text-[#94A3B8] transition-colors focus:border-[#315EF7] focus:outline-none focus:ring-[3px] focus:ring-[#315EF7]/15"
              />
              <p id={emailHintId} className="text-xs leading-relaxed text-[#64748B]">
                Use your school-issued DepEd email.
              </p>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={passwordId}
                  className="block text-sm font-semibold text-brand-900"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="rounded text-xs font-medium text-[#315EF7] hover:text-[#203B7A] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315EF7] focus-visible:ring-offset-2"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? errorId : undefined}
                  className="h-11 w-full rounded-[4px] border border-[#DCE4F0] bg-white px-3.5 pr-10 text-sm text-brand-950 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] placeholder:text-[#94A3B8] transition-colors focus:border-[#315EF7] focus:outline-none focus:ring-[3px] focus:ring-[#315EF7]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#94A3B8] transition-colors hover:text-[#14295F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315EF7]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#263449] select-none">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded-[3px] border-[#DCE4F0] text-[#315EF7] accent-[#315EF7] focus:ring-2 focus:ring-[#315EF7]/30 focus:ring-offset-1"
                />
                <span>Remember me</span>
              </label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              variant="primary"
              className="h-11 w-full rounded-[4px] bg-[#14295F] text-sm font-semibold text-white hover:bg-[#203B7A] focus-visible:ring-2 focus-visible:ring-[#315EF7] focus-visible:ring-offset-2 active:scale-[0.99] transition-all"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Account notice */}
          <div className="mt-6 text-center">
            <p className="text-xs leading-relaxed text-[#64748B]">
              Accounts are provided by the school administrator.
              <br />
              Contact the school office if you need assistance.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
