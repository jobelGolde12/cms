import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditorialContainer, Eyebrow } from "./editorial";

/**
 * Conversion section — quiet typographic invitation (design.md §25).
 * Retains the dark treatment but stripped of gradient blobs and oversized
 * rounded buttons: one eyebrow, one large question, two honest CTAs.
 */
export function WelcomeCTA() {
  return (
    <section className="bg-brand-950 text-white">
      <EditorialContainer className="py-24 md:py-32 lg:py-40">
        <Eyebrow className="text-brand-400">Access</Eyebrow>

        <h2 className="mt-6 max-w-3xl text-[2.1rem] md:text-[2.75rem] lg:text-[3.25rem] leading-[1.05] font-normal tracking-[-0.035em] text-white md:leading-[1.03]">
          Ready to access the system?
        </h2>

        <p className="mt-6 max-w-[52ch] text-[14px] leading-[1.6] text-brand-300 md:text-base">
          Authorized school personnel can sign in with their DepEd email.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-stretch gap-3 sm:items-center sm:gap-6 sm:gap-x-8 sm:gap-y-4">
          <Link
            href="/login"
            className="group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[3px] bg-white px-5 text-[12px] font-medium text-brand-950 transition-colors duration-200 hover:bg-brand-100 sm:flex-none"
          >
            Sign In
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/verify"
            className="group -my-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-[3px] border border-white/30 px-4 text-[12px] font-medium text-white transition-colors duration-200 hover:border-white/60 sm:flex-none"
          >
            Verify a Record
            <ArrowRight
              className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>

        <p className="mt-10 max-w-[52ch] text-xs leading-[1.6] text-brand-400">
          Accounts are provisioned by the school administrator. All access is
          logged and audited per RA 10173.
        </p>
      </EditorialContainer>
    </section>
  );
}
