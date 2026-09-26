import Link from "next/link";
import {
  ArrowRight,
  Building2,
  MapPin,
  Award,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MUNICIPALITY } from "@/lib/constants";

/**
 * Hero section with primary heading, supporting description, dual CTAs,
 * and an institutional visual element.
 */
export function WelcomeHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="info" icon={false} className="mb-6">
            Official DepEd Form 1 Verification & Census Portal
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-950 leading-tight md:text-5xl lg:text-6xl">
            Municipal Child Mapping System
          </h1>
          <p className="mt-6 text-lg text-brand-600 md:text-xl">
            The official platform for the Municipality of {MUNICIPALITY.shortName} to register,
            validate, and monitor child census data across all 14 barangays — compliant with
            RA 10173 and DepEd Child Protection Policy.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-950 px-6 text-base font-medium text-white shadow-sm transition-colors duration-200 hover:bg-brand-900 active:bg-brand-900"
            >
              Sign In to Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-brand-300 bg-white px-6 text-base font-medium text-brand-800 transition-colors duration-200 hover:border-action-600 hover:bg-action-50"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Request Access
            </Link>
          </div>
          <p className="mt-6 text-sm text-brand-500">
            Authorized personnel only. Registration requires LGU approval.
          </p>
        </div>

        <div className="mt-16 flex justify-center">
          <div className="relative flex max-w-md flex-col items-center gap-4 rounded-2xl border border-brand-200 bg-white p-8 shadow-lg shadow-brand-100/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-action-50">
              <Building2 className="h-8 w-8 text-action-700" aria-hidden="true" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-900">
                Republic of the Philippines
              </p>
              <p className="text-xs font-medium text-brand-500">
                LGU {MUNICIPALITY.shortName} • DepEd Sorsogon Division
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-brand-500">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {MUNICIPALITY.region}
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-3 w-3" aria-hidden="true" />
                {MUNICIPALITY.province}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                14 Barangays
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}