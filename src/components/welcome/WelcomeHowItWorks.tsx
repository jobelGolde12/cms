/** Workflow steps derived from the actual application. */
const steps = [
  {
    number: "01",
    title: "Register Account",
    description:
      "Authorized personnel apply for system access through the official registration portal, subject to LGU approval.",
  },
  {
    number: "02",
    title: "Access Dashboard",
    description:
      "Sign in to reach the role-appropriate dashboard with scoped navigation — barangay, municipal, or admin view.",
  },
  {
    number: "03",
    title: "Manage Records",
    description:
      "Create, validate, and monitor child records. Use QR codes for field verification. Generate reports for planning and compliance.",
  },
];

/**
 * Visual workflow explanation showing the three main phases of using the system.
 */
export function WelcomeHowItWorks() {
  return (
    <section className="py-20 md:py-28 lg:py-36 bg-gradient-to-b from-brand-50/40 to-white border-y border-brand-200/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-20">
          <h2 className="text-[2rem] font-extrabold tracking-tight text-brand-950 leading-tight md:text-[2.5rem] lg:text-[3rem]">
            How It Works
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-brand-600 md:text-xl">
            A streamlined workflow for authorized personnel to manage child mapping data securely and efficiently.
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-3 md:gap-6">
          {steps.map((step, index) => (
            <article
              key={step.number}
              className="group relative flex flex-col items-center text-center px-6 py-10 rounded-3xl border border-brand-200/60 bg-white/60 shadow-sm shadow-brand-100/30 hover:shadow-lg hover:shadow-brand-100/40 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Step number */}
              <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-brand-900 to-brand-800 shadow-lg shadow-brand-950/10 font-extrabold text-2xl text-white ring-1 ring-brand-200/30">
                  {step.number}
                </div>

              <h3 className="text-xl font-bold text-brand-950 tracking-tight">{step.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-brand-600 max-w-xs mx-auto">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
