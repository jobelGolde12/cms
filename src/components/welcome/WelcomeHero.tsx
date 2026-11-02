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
import { cn } from "@/lib/utils";
import { EditorialContainer, Eyebrow } from "./editorial";

// Hero illustration (public/hero-section-image.svg) as a static import:
// TypeScript infers the intrinsic 960×845.748 dimensions and Next fingerprints
// the asset. Rendered with `unoptimized` below because next/image does not
// process SVGs through the optimizer (avoids prod-only rasterization issues).
import heroImage from "../../../public/hero-section-image.svg";

/**
 * Hero — centered, Notion-inspired composition for the editorial redesign.
 *
 * All copy is preserved from the previous hero; only the presentation changes:
 * centered eyebrow → dominant headline → short supporting copy → one prominent
 * CTA with a quiet secondary → a single, larger illustration below → the
 * institutional metadata strip anchoring the bottom.
 */
export function WelcomeHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <EditorialContainer className="relative">
        <div className="flex flex-col items-center pb-16 pt-16 text-center md:pb-12 md:pt-20 lg:pt-24">
          <div className="rise">
            <Eyebrow>
              Republic of the Philippines · {SCHOOL.region}
            </Eyebrow>
          </div>

          {/* Dominant headline — scale carries the hierarchy, centered and
              balanced so it never produces awkward ragged breaks. */}
          <h1 className="rise rise-d1 mt-6 max-w-[18ch] text-balance text-[clamp(2.6rem,7vw,4.5rem)] leading-[1.02] font-normal tracking-[-0.04em] text-brand-950">
            Records Management System.
          </h1>

          <p className="rise rise-d2 mx-auto mt-7 max-w-[48ch] text-balance text-[15px] leading-[1.65] text-[#64748B] md:text-lg md:leading-[1.6]">
            The official platform for{" "}
            <strong className="font-medium text-brand-800">
              {SCHOOL.name}
            </strong>{" "}
            to enroll, verify, and monitor student records and performance —
            compliant with RA 10173 and the DepEd Child Protection Policy.
          </p>

          {/* CTA pair: one confident primary + one quiet bordered secondary. */}
          <div className="rise rise-d3 mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/login"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-950 px-6 text-[13px] font-medium text-white transition-colors duration-200 hover:bg-brand-800"
            >
              Sign In to Dashboard
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/verify"
              className="group inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-brand-200 px-5 text-[13px] font-medium text-brand-900 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50"
            >
              Verify a Record
              <ArrowRight
                className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>

          <p className="rise rise-d4 mt-7 text-xs text-brand-400">
            Authorized school personnel only. Accounts are provisioned by the
            school administrator.
          </p>
        </div>

        {/* ── Large hero visual, centered beneath the hero copy ── */}
        <div className="rise rise-d2 relative mx-auto w-full max-w-[420px] sm:max-w-[520px] md:max-w-2xl lg:pb-8">
          <div className="relative aspect-[960/845.748]">
            {/* Soft radial wash — one quiet depth cue behind the
                illustration, flat editorial palette undisturbed. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-16 -inset-y-10 bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)] md:-inset-x-28"
            />
            {/* `unoptimized`: next/image does not optimize SVGs; per-image
                opt-out keeps dev/prod identical without enabling
                dangerouslyAllowSVG globally. */}
            <Image
              src={heroImage}
              alt="Illustration of municipal child census records being organized and reviewed"
              fill
              priority
              unoptimized
              sizes="(min-width: 768px) 672px, (min-width: 640px) 520px, 90vw"
              className="object-contain"
            />
          </div>

          {/* Editorial annotation — one small art-directed detail. */}
          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] leading-[1.4] text-brand-400">
            <GraduationCap
              className="h-3 w-3 text-action-600"
              aria-hidden="true"
            />
            {SCHOOL.shortName} · DepEd Sorsogon Division
          </p>
        </div>

        {/* ── Metadata strip — quiet institutional anchors ── */}
        <div className="rise rise-d3 grid gap-4 border-t border-brand-200 px-4 py-6 sm:px-6 sm:py-8 md:grid-cols-3 md:gap-0 md:py-8 lg:px-8">
          {[
            { icon: MapPin, label: "Location", value: `${SCHOOL.address}` },
            { icon: Award, label: "Province", value: `${SCHOOL.province}` },
            {
              icon: CheckCircle2,
              label: "Coverage",
              value: "Grades 7–12",
            },
          ].map(({ icon: Icon, label, value }, index) => (
            <div
              key={label}
              className={cn(
                "flex items-start justify-center gap-2 md:justify-start md:px-6",
                index > 0 && "md:border-l md:border-brand-200",
              )}
            >
              <Icon
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300"
                aria-hidden="true"
              />
              <div>
                <p className="eyebrow">{label}</p>
                <p className="mt-0.5 text-xs text-brand-700">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </EditorialContainer>
    </section>
  );
}
