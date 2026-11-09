import Link from "next/link";
import Image from "next/image";
import { ArrowRight, GraduationCap } from "lucide-react";
import { SCHOOL } from "@/lib/constants";
import { EditorialContainer, Eyebrow } from "./editorial";

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
 * editorial annotation. All content is preserved from the previous hero.
 *
 * Responsive layout: below `lg` the image takes full width beneath the
 * editorial text; at and above `lg`, a two-column composition balances
 * the visual with the text column. The constraint helper keeps every
 * breakpoint within the viewport no matter how wide the content gets.
 */
export function WelcomeHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <EditorialContainer className="relative">
        <div className="grid gap-12 pb-20 pt-12 md:pb-24 md:pt-16 lg:pb-28 lg:pt-20 lg:grid-cols-[8fr_5fr] lg:items-center">
          {/* ── Left: editorial text composition (columns 1–8) ── */}
          <div className="min-w-0">
            <Eyebrow>
              Republic of the Philippines · {SCHOOL.region}
            </Eyebrow>

            <h1 className="mt-6 rise mt-0 max-w-[20ch] text-balance text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.02] font-normal tracking-[-0.04em] text-brand-950 md:text-[clamp(2rem,4vw,3rem)]">
              Records Management System.
            </h1>

            <p className="mt-8 rise max-w-[40ch] text-[14px] leading-[1.6] text-[#64748B] md:text-base">
              The official platform for{" "}
              <strong className="font-medium text-brand-800">
                {SCHOOL.name}
              </strong>{" "}
              to enroll, verify, and monitor student records and performance —
              compliant with RA 10173 and the DepEd Child Protection Policy.
            </p>

            {/* Minimal CTA pair: one compact dark button + one text link (§12). */}
            <div className="rise mt-10 flex flex-col sm:flex-row items-center gap-x-4 gap-y-3 sm:gap-x-8 sm:gap-y-4">
              <Link
                href="/login"
                className="group inline-flex h-11 items-center gap-2 rounded-[3px] bg-brand-950 px-5 text-[12px] font-medium text-white transition-colors duration-200 hover:bg-brand-800"
              >
                Sign In to Dashboard
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link
                href="/verify"
                className="group -my-2 inline-flex items-center gap-1 py-2 px-3 text-[12px] font-medium text-brand-900 transition-colors duration-200 hover:text-action-700"
              >
                Verify a Record
                <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>

            <p className="rise mt-6 text-xs text-brand-400">
              Authorized school personnel only. Accounts are provisioned by the
              school administrator.
            </p>
          </div>

          {/* ── Right: one dominant visual object (columns 9–13) ── */}
          <div className="rise min-w-0">
            <div className="relative mx-auto w-full max-w-[440px] md:ml-auto lg:max-w-[360px] lg:mx-auto">
              <div className="relative aspect-[960/845.748]">
                {/* Soft radial wash — one quiet depth cue behind the
                    illustration, flat editorial palette undisturbed. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-8 bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)]"
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
                  sizes="(min-width: 1024px) 360px, (min-width: 640px) 30vw, 85vw"
                  className="object-contain"
                />
              </div>

              {/* Editorial annotation — one small art-directed detail (§16). */}
              <p className="mt-4 flex items-center gap-1.5 pl-0.5 text-[11px] leading-[1.4] text-brand-400">
                <GraduationCap className="h-3 w-3 text-action-600" aria-hidden="true" />
                {SCHOOL.shortName} · DepEd Sorsogon Division
              </p>
            </div>
          </div>
        </div>
      </EditorialContainer>
    </section>
  );
}
