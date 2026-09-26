import Link from "next/link";
import { Users, ShieldCheck } from "lucide-react";

/**
 * Call-to-action section prompting users to access the system.
 */
export function WelcomeCTA() {
  return (
    <section className="py-16 md:py-24 bg-brand-900">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          Ready to Access the System?
        </h2>
        <p className="mt-4 text-lg text-brand-300">
          Authorized personnel can sign in or request an account through the official
          registration portal.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-6 text-base font-medium text-brand-900 shadow-sm transition-colors duration-200 hover:bg-brand-100 active:bg-brand-200 sm:w-auto"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-brand-300 bg-transparent px-6 text-base font-medium text-white transition-colors duration-200 hover:border-white/60 hover:bg-white/10 sm:w-auto"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Register for Access
          </Link>
        </div>
        <p className="mt-6 text-sm text-brand-500">
          Registration requires approval from the Municipal LGU. All access is logged and
          audited per RA 10173.
        </p>
      </div>
    </section>
  );
}