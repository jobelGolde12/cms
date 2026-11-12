import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { SCHOOL } from "@/lib/constants";
import { HeroEffects } from "./HeroEffects";

/**
 * Welcome hero.
 *
 * The real photograph of Sta. Magdalena National High School
 * (`public/school1.jpg`) is the primary visual and fills the whole section.
 * A dark navy scrim keeps the institutional typography readable without
 * hiding the building, and the copy is reduced to the four intended beats:
 * school identity → Records Management System → one supporting line →
 * Sign In.
 *
 * The backdrop drifts at a fraction of the scroll speed via a CSS
 * scroll-driven animation (`.hero-parallax` in globals.css). That keeps the
 * hero a Server Component — no scroll listeners, no extra client JS — and the
 * animation is disabled entirely for prefers-reduced-motion.
 */
export function WelcomeHero() {
  return (
    <section className="relative isolate overflow-hidden bg-brand-950">
      {/* ── Photographic backdrop ──────────────────────────────────────────
          The wrapper is 120% of the hero's height so the parallax drift can
          never expose an edge. `object-cover` preserves the photo's
          proportions; the focal point stays on the facade and the school's
          name board at every breakpoint. */}
      <div className="hero-parallax absolute inset-x-0 -bottom-[10%] -top-[10%]">
        <Image
          src="/school1.jpg"
          alt="The Sta. Magdalena National High School building in Sorsogon"
          fill
          preload
          sizes="100vw"
          className="object-cover object-[52%_42%] md:object-[52%_45%]"
        />
      </div>

      {/* Readability scrim: bottom-weighted on mobile, left-weighted on
          desktop so the building stays clear on the right. */}
      <div aria-hidden="true" className="hero-scrim absolute inset-0" />

      <HeroEffects />

      {/* ── Hero content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex min-h-[clamp(540px,82svh,820px)] w-full max-w-6xl items-end px-5 pb-14 pt-28 sm:px-8 md:items-center md:px-10 md:py-28 lg:px-16 lg:py-32">
        <div className="w-full max-w-[40rem]">
          <div className="rise flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-gold-400" />
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/85 sm:text-[11px]">
              {SCHOOL.name}
            </p>
          </div>

          <h1 className="rise rise-d1 mt-6 max-w-[18ch] text-balance text-[clamp(2.1rem,6vw,4.25rem)] font-normal leading-[0.98] tracking-[-0.035em] text-white">
            Records Management System
          </h1>

          <p className="rise rise-d2 mt-6 max-w-[44ch] text-[15px] leading-[1.65] text-white/75 md:text-base">
            A secure, centralized home for enrollment, student records, and
            academic performance.
          </p>

          <div className="rise rise-d3 mt-9">
            <Link
              href="/login"
              className="group inline-flex h-12 items-center gap-2.5 rounded-[3px] bg-white px-6 text-[13px] font-semibold text-brand-950 transition-colors duration-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Sign In
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
