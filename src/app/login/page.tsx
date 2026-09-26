"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  User,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";

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
    <main className="flex min-h-screen flex-col bg-brand-50">
      {/* Institutional Header */}
      <header className="border-b border-brand-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white shadow-sm">
              <Lock aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[11px] font-bold uppercase tracking-wide text-brand-900">
                Republic of the Philippines
              </p>
              <p className="truncate text-[10px] font-medium text-brand-500">
                LGU STA. MAGDALENA • DEPED SORSOGON DIVISION
              </p>
            </div>
          </div>

          <nav
            aria-label="Utility"
            className="flex shrink-0 items-center gap-2 text-sm font-medium text-brand-800 sm:gap-3"
          >
            <a
              href="#"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:text-action-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600 focus-visible:ring-offset-2"
            >
              <HelpCircle aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Support</span>
            </a>
            <span aria-hidden="true" className="text-brand-300">
              |
            </span>
            <a
              href="#"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:text-action-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600 focus-visible:ring-offset-2"
            >
              <User aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        {/* Title Area */}
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-950 sm:text-4xl">
            Sta. Magdalena
          </h1>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-brand-900 sm:text-xl">
            Child Mapping System
          </h2>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-action-700 sm:text-sm">
            Official DepEd Form 1 Verification &amp; Census Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full rounded-2xl border border-brand-200 bg-white px-5 py-6 shadow-lg shadow-brand-100/50 sm:px-8 sm:py-8">
          {/* Security Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-brand-200 pb-4">
            <div className="flex items-center gap-2">
              <Lock aria-hidden="true" className="h-4 w-4 text-action-700" />
              <span className="text-sm font-semibold text-action-700">
                Authorized Access Only
              </span>
            </div>
            <span className="text-xs text-brand-400">TLS 1.3 Encrypted</span>
          </div>

          <form action={formAction} className="space-y-5" noValidate>
            {hasError ? (
              <div
                id={errorId}
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-status-error-bg px-4 py-3 text-sm font-medium text-red-800"
              >
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>{state.error}</span>
              </div>
            ) : null}

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={emailId}
                className="block text-sm font-semibold text-brand-800"
              >
                Username or DepEd Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400">
                  <User aria-hidden="true" className="h-4 w-4" />
                </span>
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
                  className="h-11 w-full rounded-lg border border-brand-300 bg-brand-50 pl-10 pr-3 text-sm text-brand-950 placeholder:text-brand-400 transition-colors focus:border-action-600 focus:outline-none focus:ring-2 focus:ring-action-600/20"
                />
              </div>
              <p id={emailHintId} className="text-xs text-brand-500">
                Use your DepEd email or assigned employee ID.
              </p>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={passwordId}
                  className="block text-sm font-semibold text-brand-800"
                >
                  Password
                </label>
                <a
                  href="#"
                  className="rounded text-xs font-medium text-action-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600 focus-visible:ring-offset-2"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400">
                  <Lock aria-hidden="true" className="h-4 w-4" />
                </span>
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? errorId : undefined}
                  className="h-11 w-full rounded-lg border border-brand-300 bg-brand-50 pl-10 pr-10 text-sm text-brand-950 placeholder:text-brand-400 transition-colors focus:border-action-600 focus:outline-none focus:ring-2 focus:ring-action-600/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-brand-400 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-brand-300 text-action-700 focus:ring-2 focus:ring-action-600 focus:ring-offset-1"
                />
                <span>Remember me</span>
              </label>
              <span className="text-[11px] text-brand-400">
                Session: 8h Auto-Revoke
              </span>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full bg-brand-950 text-base font-semibold text-white hover:bg-brand-900 focus-visible:ring-2 focus-visible:ring-action-600 focus-visible:ring-offset-2"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Registration Link */}
          <div className="mt-5 text-center">
            <p className="text-sm text-brand-600">
              Need an authorized account?{" "}
              <Link
                href="/register"
                className="font-semibold text-action-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600 focus-visible:ring-offset-2"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-xs text-brand-600">
            <ShieldCheck
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-action-700"
            />
            <span className="text-balance">
              Protected under <strong>RA 10173</strong> ·{" "}
              <strong>DepEd Child Protection Policy</strong>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}