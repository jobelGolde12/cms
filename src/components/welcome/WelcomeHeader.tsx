import Link from "next/link";
import { Users, ShieldCheck } from "lucide-react";
import { MUNICIPALITY } from "@/lib/constants";

/**
 * Welcome header with institutional branding and refined navigation.
 */
export function WelcomeHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group" aria-label="Home">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-900 to-brand-800 shadow-md shadow-brand-950/10 group-hover:shadow-lg transition-shadow duration-200 ring-1 ring-brand-200/30">
            <Users className="h-5.5 w-5.5 text-white" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-900">
              {MUNICIPALITY.shortName}
            </div>
            <div className="text-sm font-extrabold text-brand-950 tracking-tight">Child Mapping System</div>
          </div>
        </Link>
        <nav className="flex items-center gap-5 md:gap-8" aria-label="Primary">
          <Link
            href="/login"
            className="text-sm font-semibold text-brand-600 hover:text-brand-950 transition-colors duration-150 relative after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-brand-900 after:transition-all hover:after:w-full"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-brand-200 bg-white px-5 text-sm font-extrabold text-brand-900 shadow-sm transition-all duration-200 hover:border-brand-400 hover:bg-brand-50 hover:shadow-md hover:-translate-y-0.5"
          >
            <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
