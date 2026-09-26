import Link from "next/link";
import { Users, ShieldCheck } from "lucide-react";
import { MUNICIPALITY } from "@/lib/constants";

/**
 * Welcome header with institutional branding and primary navigation CTA.
 * Reuses existing: Link, Button, MUNICIPALITY, badge styling.
 */
export function WelcomeHeader() {
  return (
    <header className="border-b border-brand-200 bg-white sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-900 text-white shadow-sm">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-bold uppercase tracking-wide text-brand-900">
              {MUNICIPALITY.shortName}
            </div>
            <div className="text-sm font-semibold text-brand-800">Child Mapping System</div>
          </div>
        </div>
        <nav className="flex items-center gap-4 md:gap-6">
          <Link
            href="/login"
            className="text-sm font-medium text-brand-600 hover:text-brand-900 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="hidden h-11 items-center justify-center gap-2 rounded-lg border border-brand-300 bg-white px-4 text-sm font-medium text-brand-800 transition-colors duration-200 hover:border-brand-400 hover:bg-brand-100 sm:inline-flex"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}