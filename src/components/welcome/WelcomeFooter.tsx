import Link from "next/link";
import { Users } from "lucide-react";
import { MUNICIPALITY } from "@/lib/constants";

/**
 * Footer using actual project information from the constants file.
 * No fake data - reuses MUNICIPALITY.name, etc. from the codebase.
 */
export function WelcomeFooter() {
  return (
    <footer className="border-t border-brand-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-900 text-white">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-brand-900">
                  {MUNICIPALITY.shortName} Child Mapping System
                </div>
                <div className="text-xs text-brand-500">Official DepEd Form 1 Portal</div>
              </div>
            </div>
            <p className="text-sm text-brand-600 max-w-xs">
              Municipal child census and verification platform for the {MUNICIPALITY.name},{" "}
              {MUNICIPALITY.province}, {MUNICIPALITY.region}. Compliant with RA 10173 (Data
              Privacy Act) and DepEd Child Protection Policy.
            </p>
          </div>

          <nav aria-label="Quick links">
            <h4 className="text-sm font-semibold text-brand-900 mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-brand-600">
              <li>
                <Link href="/login" className="hover:text-brand-900 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-brand-900 transition-colors">
                  Request Access
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Compliance">
            <h4 className="text-sm font-semibold text-brand-900 mb-4">Compliance</h4>
            <ul className="space-y-2 text-sm text-brand-600">
              <li>
                <span className="font-medium text-brand-900">RA 10173</span> — Data
                Privacy Act
              </li>
              <li>
                <span className="font-medium text-brand-900">DepEd Policy</span> — Child
                Protection
              </li>
              <li>
                <span className="font-medium text-brand-900">DepEd Form 1</span> — Enrollment
                Verification
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-brand-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-brand-400">
            © 2026 Municipal Government of Sta. Magdalena · DepEd Schools Division of Sorsogon
          </p>
          <p className="text-xs text-brand-400">
            Secure, audited, and purpose-built for municipal governance.
          </p>
        </div>
      </div>
    </footer>
  );
}