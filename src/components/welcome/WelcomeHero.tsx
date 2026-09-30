import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Award,
  Landmark,
} from "lucide-react";
import { MUNICIPALITY } from "@/lib/constants";
import { BRAND_NAME, logoImage } from "@/components/logo";
import {
  EditorialContainer,
  Eyebrow,
} from "./editorial";

/**
 * Hero — the defining section of the editorial redesign (design.md §7–16).
 *
 * Left-aligned thin headline, tiny eyebrow, short supporting copy, one
 * minimal CTA pair, and a single dominant visual object on the right:
 * the square institutional brand emblem as an art-directed, frame-less
 * object with an editorial annotation. Metadata strip anchors the bottom.
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
        <div className="grid items-center gap-16 pb-24 pt-14 md:pb-32 md:pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-36 lg:pt-24">
          {/* ── Left: editorial text composition (columns 1–7) ── */}
          <div className="lg:col-span-7">
            <div className="rise">
              <Eyebrow>
                Republic of the Philippines · {MUNICIPALITY.region}
              </Eyebrow>
            </div>

            <h1 className="rise rise-d1 mt-6 max-w-[11ch] text-[2.75rem] leading-[0.98] font-normal tracking-[-0.05em] text-brand-950 sm:text-[3.5rem] md:text-[4rem] lg:text-[4.5rem] xl:text-[5rem]">
              Municipal Child
              <br />
              Mapping System.
            </h1>

            <p className="rise rise-d2 mt-8 max-w-[38ch] text-[15px] leading-[1.55] text-brand-500 md:text-base">
              The official platform for the Municipality of{" "}
              <strong className="font-medium text-brand-800">
                {MUNICIPALITY.shortName}
              </strong>{" "}
              to register, validate, and monitor child census data across all{" "}
              <strong className="font-medium text-brand-800">14 barangays</strong>{" "}
              — compliant with RA 10173 and the DepEd Child Protection Policy.
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
                href="/register"
                className="group -my-2.5 inline-flex items-center gap-1.5 py-2.5 text-[13px] font-medium text-brand-900 transition-colors duration-200 hover:text-action-700"
              >
                Request Access
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>

            <p className="rise rise-d4 mt-6 text-xs text-brand-400">
              Authorized personnel only. Registration requires LGU approval.
            </p>
          </div>

          {/* ── Right: one dominant visual object (columns 8–12) ── */}
          <div className="rise rise-d2 lg:col-span-5">
            <div className="relative mx-auto max-w-sm lg:ml-auto lg:max-w-md lg:translate-y-2">
              <div className="relative aspect-square">
                {/* Next/Image with static import → inferred dimensions, no CLS. */}
                <Image
                  src={logoImage}
                  alt={`${BRAND_NAME} official seal`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 448px, (min-width: 640px) 384px, 80vw"
                  className="object-contain drop-shadow-[0_24px_48px_rgba(2,6,23,0.14)]"
                />
              </div>

              {/* Editorial annotation — one small art-directed detail (§16). */}
              <p className="mt-6 flex items-center gap-2 pl-1 text-xs text-brand-400">
                <Landmark className="h-3.5 w-3.5 text-action-600" aria-hidden="true" />
                LGU {MUNICIPALITY.shortName} · DepEd Sorsogon Division
              </p>
            </div>
          </div>
        </div>

        {/* ── Metadata strip — quiet institutional anchors (§24) ── */}
        <div className="rise rise-d3 grid grid-cols-1 gap-6 border-t border-brand-200 py-8 sm:grid-cols-3 lg:grid-cols-3">
          {[
            { icon: MapPin, label: "Location", value: `${MUNICIPALITY.region}` },
            { icon: Award, label: "Province", value: `${MUNICIPALITY.province}` },
            { icon: CheckCircle2, label: "Coverage", value: "14 Barangays" },
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
