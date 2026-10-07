import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Award,
  GraduationCap,
} from "lucide-react";
import { SCHOOL } from "@/lib/constants";
import {
  EditorialContainer,
  Eyebrow,
} from "./editorial";

// Hero illustration (public/hero-section-image.svg) as a static import:
// TypeScript infers the intrinsic 960×845.748 dimensions and Next fingerprints
// the asset. Rendered with `unoptimized` below because next/image does not
// process SVGs through the optimizer (avoids prod-only rasterization issues).
import heroImage from "../../../public/hero-section-image.svg";

/**
 * Hero — the defining section of the editorial redesign (design.md §7–16).
 *
 * Left-aligned thin headline, tiny eyebrow, short supporting copy, one
 * minimal CTA pair, and a single dominant visual object on the right:
 * the hero illustration as an art-directed, frame-less object with an
 * editorial annotation. Metadata strip anchors the bottom.
 * All content is preserved from the previous hero.
 */
export function WelcomeHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Quiet edge reference: one vertical hairline on large screens only. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-6 hidden w-px bg-brand-100 lg:block xl:left-16"
        aria-hidden="true"
      />

      <EditorialContainer className="relative">
        <div className="grid gap-12 pb-24 pt-14 md:pb-32 md:pt-20 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-36 lg:pt-24">
          {/* ── Left: editorial text composition (columns 1–7) ── */}
          <div className="min-w-0 lg:col-span-7">
            <div className="rise">
              <Eyebrow>
                Republic of the Philippines · {SCHOOL.region}
              </Eyebrow>
            </div>

            <h1 className="rise rise-d1 mt-6 max-w-[17ch] text-balance text-[clamp(2.75rem,6.2vw,5rem)] leading-[1.02] font-normal tracking-[-0.04em] text-brand-950">
              Records Management System.
            </h1>

            <p className="rise rise-d2 mt-8 max-w-[38ch] text-[15px] leading-[1.55] text-brand-500 md:text-base">
              The official platform for{" "}
              <strong className="font-medium text-brand-800">
                {SCHOOL.name}
              </strong>{" "}
              to enroll, verify, and monitor student records and performance —
              compliant with RA 10173 and the DepEd Child Protection Policy.
            </p>

            {/* Minimal CTA pair: one compact dark button + one text link (§12). */}
            <div className="rise rise-d3 mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link
                href="/login"
                className="group inline-flex h-12 items-center gap-2.5 rounded-[3px] bg-brand-950 px-6 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-brand-800"
              >
                Sign In to Dashboard
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link
                href="/verify"
                className="group -my-2.5 inline-flex items-center gap-1.5 py-2.5 text-[13px] font-medium text-brand-900 transition-colors duration-200 hover:text-action-700"
              >
                Verify a Record
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>

            <p className="rise rise-d4 mt-6 text-xs text-brand-400">
              Authorized school personnel only. Accounts are provisioned by the
              school administrator.
            </p>
          </div>

          {/* ── Right: one dominant visual object (columns 8–12) ── */}
          <div className="rise rise-d2 min-w-0 lg:col-span-5">
            <div className="relative mx-auto w-full max-w-[420px] lg:ml-auto lg:max-w-lg">
              <div className="relative aspect-[960/845.748]">
                {/* `unoptimized`: next/image does not optimize SVGs; per-image
                    opt-out keeps dev/prod identical without enabling
                    dangerouslyAllowSVG globally. */}
                <Image
                  src={heroImage}
                  alt="Illustration of municipal child census records being organized and reviewed"
                  fill
                  priority
                  unoptimized
                  sizes="(min-width: 1024px) 40vw, (min-width: 640px) 448px, 90vw"
                  className="object-contain"
                />
              </div>

              {/* Editorial annotation — one small art-directed detail (§16). */}
              <p className="mt-6 flex items-center gap-2 pl-1 text-xs text-brand-400">
                <GraduationCap className="h-3.5 w-3.5 text-action-600" aria-hidden="true" />
                {SCHOOL.shortName} · DepEd Sorsogon Division
              </p>
            </div>
          </div>
        </div>

        {/* ── Metadata strip — quiet institutional anchors (§24) ── */}
        <div className="rise rise-d3 grid grid-cols-1 gap-6 border-t border-brand-200 py-8 sm:grid-cols-3 lg:grid-cols-3">
          {[
            { icon: MapPin, label: "Location", value: `${SCHOOL.address}` },
            { icon: Award, label: "Province", value: `${SCHOOL.province}` },
            { icon: CheckCircle2, label: "Coverage", value: "Grades 7–12" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
              <div>
                <p className="eyebrow">{label}</p>
                <p className="mt-1 text-sm text-brand-700">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </EditorialContainer>
    </section>
  );
}
