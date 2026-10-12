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
    title: "Enroll & Record",
    description:
      "Records personnel register students with guardians and enroll them in grade levels and sections. Verification keeps learner data accurate.",
  },
  {
    number: "02",
    title: "Teach & Track",
    description:
      "Advisers record grades, attendance, behavior, and reading/literacy/numeracy assessments for their sections.",
  },
  {
    number: "03",
    title: "Analyze & Intervene",
    description:
      "Analytics surface performance trends; guidance plans interventions, and reports export to PDF or Excel for compliance.",
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
              A streamlined workflow for school personnel to manage learner
              records securely and efficiently.
            </Lede>
          </div>
        </div>

        <EditorialRule className="mt-12 md:mt-16" />

        <div className="grid gap-x-6 gap-y-10 pt-10 sm:grid-cols-2 md:grid-cols-3 sm:gap-y-12 sm:pt-12 md:pt-16">
          {steps.map((step) => (
            <article key={step.number} className="group">
              <p className="numeric text-[12px] font-medium tracking-[0.08em] text-brand-300 transition-colors duration-300 group-hover:text-action-600">
                {step.number}
              </p>
              <h3 className="mt-3 text-base font-medium tracking-[-0.01em] text-brand-950">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[38ch] text-[14px] leading-[1.6] text-brand-500">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </EditorialContainer>
    </section>
  );
}
