import Link from "next/link";
import {
  ArrowRight,
  Building2,
  MapPin,
  Award,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { MUNICIPALITY } from "@/lib/constants";

/**
 * Hero section with refined typography, subtle geometric decoration,
 * and a polished institutional visual element.
 */
export function WelcomeHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/80 to-white py-20 md:py-28 lg:py-36">
      {/* Subtle geometric background decoration — theme-aligned, non-generic */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-action-50/40 blur-3xl" />
        <svg
          className="absolute top-12 left-8 opacity-[0.07] text-brand-900"
          width="240"
          height="240"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <circle cx="100" cy="100" r="90" />
          <circle cx="100" cy="100" r="60" />
          <line x1="100" y1="10" x2="100" y2="190" />
          <line x1="10" y1="100" x2="190" y2="100" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700 shadow-sm backdrop-blur-sm mb-8">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-action-600" aria-hidden="true" />
            Official Municipal Platform
          </p>

          <h1 className="text-[2.75rem] leading-[1.1] font-extrabold tracking-tight text-brand-950 md:text-[3.5rem] lg:text-[4.25rem]">
            Municipal Child{" "}
            <span className="text-action-700">Mapping</span> System
          </h1>

          <p className="mt-8 text-lg leading-relaxed text-brand-600 md:text-xl md:leading-relaxed">
            The official platform for the Municipality of{" "}
            <strong className="text-brand-900">{MUNICIPALITY.shortName}</strong> to register,
            validate, and monitor child census data across all{" "}
            <strong className="text-brand-900">14 barangays</strong> — compliant with RA 10173
            and the DepEd Child Protection Policy.
          </p>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-brand-950 px-8 text-base font-semibold text-white shadow-lg shadow-brand-950/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-900 hover:shadow-xl hover:shadow-brand-950/10 active:translate-y-0 active:shadow-md"
            >
              Sign In to Dashboard
              <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
            </Link>
            <Link
              href="/register"
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-xl border-2 border-brand-200 bg-white/70 px-8 text-base font-semibold text-brand-800 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-action-600 hover:bg-action-50/70 hover:shadow-lg active:translate-y-0"
            >
              <ShieldCheck className="h-5 w-5 text-action-700" aria-hidden="true" />
              Request Access
            </Link>
          </div>

          <p className="mt-6 text-sm text-brand-500">
            Authorized personnel only. Registration requires LGU approval.
          </p>
        </div>

        <div className="mt-20 flex justify-center">
          <div className="relative flex max-w-md flex-col items-center gap-5 rounded-3xl border border-brand-200/70 bg-white/80 p-10 shadow-xl shadow-brand-100/30 backdrop-blur-md">
            {/* Subtle top accent line */}
            <div className="absolute top-0 left-6 right-6 h-1 rounded-full bg-gradient-to-r from-transparent via-action-500/40 to-transparent" aria-hidden="true" />

            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-action-50 to-brand-50 shadow-inner shadow-brand-200/40 ring-1 ring-brand-100">
              <Building2 className="h-10 w-10 text-action-700" aria-hidden="true" />
            </div>

            <div className="text-center space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-400">
                Republic of the Philippines
              </p>
              <p className="text-base font-extrabold text-brand-950 tracking-tight">
                LGU {MUNICIPALITY.shortName}
              </p>
              <p className="text-xs font-medium text-brand-500">
                DepEd Sorsogon Division
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-brand-500 pt-2">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
                {MUNICIPALITY.region}
              </span>
              <span className="h-3.5 w-px bg-brand-200" aria-hidden="true" />
              <span className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
                {MUNICIPALITY.province}
              </span>
              <span className="h-3.5 w-px bg-brand-200" aria-hidden="true" />
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
                14 Barangays
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
