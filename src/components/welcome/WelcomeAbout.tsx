import { CheckCircle2 } from "lucide-react";

/**
 * About / purpose section explaining the system's role in municipal governance.
 */
export function WelcomeAbout() {
  return (
    <section className="py-16 md:py-24 bg-white border-y border-brand-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-brand-950 md:text-4xl">
              Purpose-Built for Municipal Governance
            </h2>
            <p className="mt-4 text-lg text-brand-600">
              The Municipal Child Mapping System serves as the single source of truth for child
              census data in Sta. Magdalena, supporting evidence-based planning for education,
              health, and social welfare programs.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-semibold text-brand-900">DepEd Form 1 Compliance</h4>
                  <p className="text-sm text-brand-600">
                    Aligned with DepEd enrollment verification requirements and child protection
                    standards.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-semibold text-brand-900">RA 10173 Data Privacy</h4>
                  <p className="text-sm text-brand-600">
                    Built-in privacy controls, role-based access, and audit logging for
                    Data Privacy Act compliance.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-semibold text-brand-900">Interoperable Exports</h4>
                  <p className="text-sm text-brand-600">
                    PDF, Excel, and CSV reports formatted for LGU planning, DepEd submissions,
                    and PSA coordination.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-8 md:p-12">
            <h3 className="text-xl font-semibold text-brand-900">Who Uses This System</h3>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <dt className="flex-shrink-0 w-28 font-medium text-brand-900">Barangay Users</dt>
                <dd className="text-brand-600">
                  Register and validate child records for their assigned barangay. Generate
                  QR codes for field verification.
                </dd>
              </div>
              <div className="flex items-start gap-3">
                <dt className="flex-shrink-0 w-28 font-medium text-brand-900">LGU Users</dt>
                <dd className="text-brand-600">
                  Municipal-level oversight: review validations, monitor interventions,
                  generate consolidated reports.
                </dd>
              </div>
              <div className="flex items-start gap-3">
                <dt className="flex-shrink-0 w-28 font-medium text-brand-900">Administrators</dt>
                <dd className="text-brand-600">
                  Full system access: user management, system settings, audit logs,
                  duplicate resolution.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}