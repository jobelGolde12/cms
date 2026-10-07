import Link from "next/link";
import { SCHOOL } from "@/lib/constants";
import { Logo } from "@/components/logo";
import { EditorialContainer } from "./editorial";

/**
 * Footer — lightweight and editorial (design.md §26): white background,
 * hairline top border, small typography, simple link columns.
 */
export function WelcomeFooter() {
  return (
    <footer className="border-t border-brand-200 bg-white">
      <EditorialContainer className="py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-12 lg:gap-12">
          {/* Brand + mission */}
          <div className="md:col-span-6">
            <Logo size="md" variant="lockup" asLink />
            <p className="mt-5 max-w-md text-[13px] leading-[1.6] text-brand-500">
              Student records and performance analytics platform for{" "}
              {SCHOOL.name}, {SCHOOL.province}, {SCHOOL.region}. Compliant with
              RA 10173 (Data Privacy Act) and the DepEd Child Protection Policy.
            </p>
          </div>

          {/* Quick links */}
          <nav className="md:col-span-3" aria-label="Quick links">
            <p className="eyebrow">Quick Links</p>
            <ul className="mt-4 space-y-1 text-[13px] text-brand-600">
              <li>
                <Link href="/login" className="-mx-2 inline-flex items-center px-2 py-2 transition-colors duration-150 hover:text-brand-950">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/verify" className="-mx-2 inline-flex items-center px-2 py-2 transition-colors duration-150 hover:text-brand-950">
                  Verify a Record
                </Link>
              </li>
            </ul>
          </nav>

          {/* Compliance */}
          <div className="md:col-span-3">
            <p className="eyebrow">Compliance</p>
            <ul className="mt-4 space-y-2.5 text-[13px] leading-[1.55] text-brand-600">
              <li>
                <span className="font-medium text-brand-900">RA 10173</span> — Data Privacy Act
              </li>
              <li>
                <span className="font-medium text-brand-900">DepEd Policy</span> — Child Protection
              </li>
              <li>
                <span className="font-medium text-brand-900">DepEd Order 8</span> — Grading &amp; Progress Reporting
              </li>
            </ul>
           </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-brand-200 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[11px] tracking-[0.02em] text-brand-400">
            © 2026 {SCHOOL.name} · DepEd Schools Division of Sorsogon
          </p>
          <p className="text-[11px] tracking-[0.02em] text-brand-400">
            Secure, audited, and purpose-built for school governance.
          </p>
        </div>
      </EditorialContainer>
    </footer>
  );
}
