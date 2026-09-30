import {
  EditorialContainer,
  Eyebrow,
  SectionTitle,
  Lede,
  EditorialRule,
} from "./editorial";

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
 * Workflow section — editorial numbered steps separated by hairlines rather
 * than card boxes (design.md §18, §49: don't turn every section into a grid
 * of cards). Hierarchy: large thin number → title → description.
 */
export function WelcomeHowItWorks() {
  return (
    <section className="bg-white py-24 md:py-32 lg:py-40">
      <EditorialContainer>
        {/* Section introduction — editorial label + heading + side copy (§18) */}
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <Eyebrow>Workflow</Eyebrow>
            <SectionTitle className="mt-4">How it works.</SectionTitle>
          </div>
          <div className="md:col-span-5">
            <Lede>
              A streamlined workflow for authorized personnel to manage child
              mapping data securely and efficiently.
            </Lede>
          </div>
        </div>

        <EditorialRule className="mt-12 md:mt-16" />

        <div className="grid gap-x-8 gap-y-12 pt-12 md:grid-cols-3 md:pt-16">
          {steps.map((step) => (
            <article key={step.number} className="group">
              <p className="numeric text-[13px] font-medium tracking-[0.08em] text-brand-300 transition-colors duration-300 group-hover:text-action-600">
                {step.number}
              </p>
              <h3 className="mt-4 text-lg font-medium tracking-[-0.01em] text-brand-950">
                {step.title}
              </h3>
              <p className="mt-3 max-w-[36ch] text-[15px] leading-[1.55] text-brand-500">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </EditorialContainer>
    </section>
  );
}
