"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, EyeOff, User, HelpCircle, Check } from "lucide-react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";

const initial = { ok: false, error: "" } as Awaited<ReturnType<typeof login>>;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <main className="min-h-screen bg-brand-50">
      {/* Institutional Header */}
      <header className="border-b border-brand-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-900 text-white shadow-sm">
              <Lock aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-900">Republic of the Philippines</p>
              <p className="text-[10px] font-medium text-brand-500">LGU STA. MAGDALENA • DEPED SORSOGON DIVISION</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-brand-800">
            <a href="#" className="flex items-center gap-1.5 hover:text-action-700 transition-colors">
              <HelpCircle aria-hidden="true" className="h-4 w-4" />
              <span>Support</span>
            </a>
            <span className="text-brand-300">|</span>
            <a href="#" className="flex items-center gap-1.5 hover:text-action-700 transition-colors">
              <User aria-hidden="true" className="h-4 w-4" />
              <span>Account</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-md px-6 py-16 md:px-8">
        {/* Title Area */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-950 leading-tight">Sta. Magdalena</h1>
          <h2 className="text-xl font-bold tracking-tight text-brand-900 mt-1">Child Mapping System</h2>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-action-700">Official DepEd Form 1 Verification & Census Portal</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-brand-200 bg-white px-8 py-8 shadow-lg shadow-brand-100/50">
          {/* Security Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-200">
            <div className="flex items-center gap-2">
              <Lock aria-hidden="true" className="h-4 w-4 text-action-700" />
              <span className="text-sm font-semibold text-action-700">Authorized Access Only</span>
            </div>
            <span className="text-xs text-brand-400">TLS 1.3 Encrypted</span>
          </div>

          <form action={formAction} className="space-y-5">
            {state.ok === false && state.error ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-status-error-bg px-4 py-3 text-sm font-medium text-red-800">
                {state.error}
              </div>
            ) : null}

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-brand-800">Username or DepEd Email</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400">
                  <User aria-hidden="true" className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. j.delacruz@deped.gov.ph"
                  required
                  className="w-full h-11 rounded-lg border border-brand-300 bg-brand-50 pl-10 pr-3 text-brand-950 placeholder:text-brand-400 focus:border-action-600 focus:outline-none transition-colors text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-400 font-medium">@deped.gov.ph or ID</span>
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-semibold text-brand-800">Password</label>
                <a href="#" className="text-xs font-medium text-action-700 hover:underline">Forgot Password?</a>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400">
                  <Lock aria-hidden="true" className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  className="w-full h-11 rounded-lg border border-brand-300 bg-brand-50 pl-10 pr-10 text-brand-950 placeholder:text-brand-400 focus:border-action-600 focus:outline-none transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-700 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-brand-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-brand-300 text-action-700 focus:ring-action-600"
                />
                <span>Remember me</span>
              </label>
              <span className="text-[11px] text-brand-400">Session: 8h Auto-Revoke</span>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-brand-950 hover:bg-brand-900 text-white h-12 text-base font-semibold"
              disabled={pending}
            >
              {pending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Registration Link */}
          <div className="mt-5 text-center">
            <p className="text-sm text-brand-600">
              Need an authorized account?{" "}
              <Link href="/register" className="font-semibold text-action-700 hover:underline underline-offset-2">Register here</Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-4 py-2 text-xs text-brand-600">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-action-700 shrink-0" />
            <span>Protected under <strong>RA 10173</strong> · <strong>DepEd Child Protection Policy</strong></span>
          </div>
        </div>
      </div>
    </main>
  );
}
