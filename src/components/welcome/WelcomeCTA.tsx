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

        <h2 className="mt-6 max-w-3xl text-[2.25rem] leading-[1.05] font-normal tracking-[-0.035em] text-white md:text-[3rem] lg:text-[3.5rem]">
          Ready to access the system?
        </h2>

        <p className="mt-6 max-w-[52ch] text-[15px] leading-[1.55] text-brand-300 md:text-base">
          Authorized personnel can sign in or request an account through the
          official registration portal.
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            href="/login"
            className="group inline-flex h-12 items-center gap-2.5 rounded-[3px] bg-white px-6 text-[13px] font-medium text-brand-950 transition-colors duration-200 hover:bg-brand-100"
          >
            Sign In
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/register"
            className="group -my-2.5 inline-flex items-center gap-1.5 py-2.5 text-[13px] font-medium text-white underline-offset-4 decoration-brand-500 hover:decoration-white transition-colors duration-200"
          >
            Register for Access
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>

        <p className="mt-10 max-w-[52ch] text-xs leading-[1.6] text-brand-400">
          Registration requires approval from the Municipal LGU. All access is
          logged and audited per RA 10173.
        </p>
      </EditorialContainer>
    </section>
  );
}
