import Link from "next/link";
import { Users } from "lucide-react";
import { MUNICIPALITY } from "@/lib/constants";

/**
 * Footer with refined spacing, typography, and visual polish.
 */
export function WelcomeFooter() {
  return (
    <footer className="border-t border-brand-200/70 bg-gradient-to-b from-white to-brand-50/50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-900 to-brand-800 shadow-md shadow-brand-950/10 ring-1 ring-brand-200/30">
                <Users className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-extrabold text-brand-950 tracking-tight">
                  {MUNICIPALITY.shortName} Child Mapping System
                </div>
                <div className="text-xs text-brand-500 font-medium">Official DepEd Form 1 Portal</div>
              </div>
            </div>
            <p className="text-[15px] leading-relaxed text-brand-600 max-w-md">
              Municipal child census and verification platform for the {MUNICIPALITY.name},{" "}
              {MUNICIPALITY.province}, {MUNICIPALITY.region}. Compliant with RA 10173 (Data
              Privacy Act) and the DepEd Child Protection Policy.
            </p>
          </div>

          <nav aria-label="Quick links">
            <h4 className="text-sm font-extrabold text-brand-950 tracking-tight mb-5">Quick Links</h4>
            <ul className="space-y-3 text-[15px] text-brand-600">
              <li>
                <Link href="/login" className="hover:text-brand-950 transition-colors duration-150 font-medium">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-brand-950 transition-colors duration-150 font-medium">
                  Request Access
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Compliance">
            <h4 className="text-sm font-extrabold text-brand-950 tracking-tight mb-5">Compliance</h4>
            <ul className="space-y-3 text-[15px] text-brand-600">
              <li>
                <span className="font-extrabold text-brand-900">RA 10173</span> — Data Privacy Act
              </li>
              <li>
                <span className="font-extrabold text-brand-900">DepEd Policy</span> — Child Protection
              </li>
              <li>
                <span className="font-extrabold text-brand-900">DepEd Form 1</span> — Enrollment Verification
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 pt-8 border-t border-brand-200/60 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-brand-400 font-medium tracking-wide">
            © 2026 Municipal Government of Sta. Magdalena · DepEd Schools Division of Sorsogon
          </p>
          <p className="text-xs text-brand-400 font-medium tracking-wide">
            Secure, audited, and purpose-built for municipal governance.
          </p>
        </div>
      </div>
    </footer>
  );
}
