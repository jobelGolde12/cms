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
    <section className="py-16 md:py-24 bg-white border-y border-brand-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-brand-950 md:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-brand-600">
            A streamlined workflow for authorized personnel to manage child mapping data securely and efficiently.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="relative flex flex-col items-center text-center px-4"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 font-bold text-2xl text-brand-900">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-brand-900">{step.title}</h3>
              <p className="mt-2 text-sm text-brand-600">{step.description}</p>
              {step.number !== "03" && (
                <div
                  className="absolute top-8 left-1/2 -translate-x-1/2 hidden h-0.5 w-full max-w-[calc(50%-2rem)] bg-brand-200 md:block"
                  aria-hidden="true"
                />
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}