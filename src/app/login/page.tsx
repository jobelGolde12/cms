"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

const initial: Awaited<ReturnType<typeof login>> = { ok: false, error: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-white shadow-sm">
            <MapPin aria-hidden="true" className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-brand-900">
            Municipality of Sta. Magdalena
          </h1>
          <p className="mt-1 text-sm text-brand-600">Province of Sorsogon · Region V</p>
          <p className="mt-2 text-base font-semibold text-action-700">
            Child Mapping Information System
          </p>
        </div>

        <Card>
          <CardHeader
            title="Sign in"
            description="Use your LGU-issued account to access the registry."
          />
          <CardBody>
            <form action={formAction} className="flex flex-col gap-4">
              {state.ok === false && state.error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-status-error-bg px-3 py-2 text-sm font-medium text-red-800"
                >
                  {state.error}
                </div>
              ) : null}

              <Field label="Email address" htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.gov.ph"
                  required
                />
              </Field>

              <Field label="Password" htmlFor="password" required>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-5 flex items-center gap-2 border-t border-brand-200 pt-4 text-xs text-brand-500">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
              <p>
                Authorized personnel only. All sign-in activity is recorded and
                audited. Contact the municipal administrator for account issues.
              </p>
            </div>
          </CardBody>
        </Card>

        <p className="mt-6 text-center text-xs text-brand-500">
          A public QR verification service is available at{" "}
          <Link href="/verify" className="font-medium text-action-700 underline underline-offset-2">
            /verify
          </Link>
          {""} for field verification of child records.
        </p>
      </div>
    </main>
  );
}