import Link from "next/link";
import { Users, ShieldCheck } from "lucide-react";

/**
 * Call-to-action section with refined dark gradient and polished buttons.
 */
export function WelcomeCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
      {/* Subtle decorative circle */}
      <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-brand-800/40 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-action-700/20 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 text-center md:py-28 lg:py-36">
        <h2 className="text-[2.5rem] font-extrabold tracking-tight text-white leading-tight md:text-[3rem] lg:text-[3.5rem]">
          Ready to Access the System?
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-brand-300 md:text-xl">
          Authorized personnel can sign in or request an account through the official
          registration portal.
        </p>
        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-white px-8 text-base font-extrabold text-brand-950 shadow-xl shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-2xl sm:w-auto"
          >
            <Users className="h-5 w-5" aria-hidden="true" />
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-white/20 bg-transparent px-8 text-base font-extrabold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/10 sm:w-auto"
          >
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            Register for Access
          </Link>
        </div>
        <p className="mt-7 text-sm text-brand-400 leading-relaxed">
          Registration requires approval from the Municipal LGU. All access is logged and
          audited per RA 10173.
        </p>
      </div>
    </section>
  );
}
