import { CheckCircle2 } from "lucide-react";

/**
 * About / purpose section explaining the system's role in municipal governance.
 */
export function WelcomeAbout() {
  return (
    <section className="py-20 md:py-28 lg:py-36 bg-gradient-to-b from-white via-brand-50/30 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20 items-start">
          <div>
            <h2 className="text-[2rem] font-extrabold tracking-tight text-brand-950 leading-tight md:text-[2.5rem] lg:text-[3rem]">
              Purpose-Built for{" "}
              <span className="text-action-700">Municipal Governance</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-brand-600 md:text-xl md:leading-relaxed">
              The Municipal Child Mapping System serves as the single source of truth for child
              census data in Sta. Magdalena, supporting evidence-based planning for education,
              health, and social welfare programs across all 14 barangays.
            </p>

            <div className="mt-10 space-y-6">
              {[
                {
                  title: "DepEd Form 1 Compliance",
                  desc: "Aligned with DepEd enrollment verification requirements and child protection standards.",
                },
                {
                  title: "RA 10173 Data Privacy",
                  desc: "Built-in privacy controls, role-based access, and audit logging for Data Privacy Act compliance.",
                },
                {
                  title: "Interoperable Exports",
                  desc: "PDF, Excel, and CSV reports formatted for LGU planning, DepEd submissions, and PSA coordination.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-5">
                  <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 shadow-sm shadow-brand-200/30 ring-1 ring-brand-200/40">
                    <CheckCircle2 className="h-6 w-6 text-action-700" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-brand-950 tracking-tight">{item.title}</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-brand-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-brand-200/60 bg-gradient-to-br from-brand-50/80 via-white/60 to-brand-50/80 p-8 md:p-12 shadow-xl shadow-brand-100/20 backdrop-blur-md ring-1 ring-brand-200/30">
            <div className="absolute top-0 left-8 right-8 h-1 rounded-full bg-gradient-to-r from-transparent via-brand-300/30 to-transparent" aria-hidden="true" />
            <h3 className="text-2xl font-extrabold text-brand-950 tracking-tight">Who Uses This System</h3>
            <dl className="mt-8 space-y-6 text-sm">
              {[
                {
                  label: "Barangay Users",
                  desc: "Register and validate child records for their assigned barangay. Generate QR codes for field verification.",
                },
                {
                  label: "LGU Users",
                  desc: "Municipal-level oversight: review validations, monitor interventions, generate consolidated reports.",
                },
                {
                  label: "Administrators",
                  desc: "Full system access: user management, system settings, audit logs, duplicate resolution.",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <dt className="flex-shrink-0 w-24 font-extrabold text-sm text-brand-950 tracking-tight pt-0.5">
                    {item.label}
                  </dt>
                  <dd className="text-brand-600 leading-relaxed">{item.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
