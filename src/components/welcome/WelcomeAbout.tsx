import { CheckCircle2 } from "lucide-react";
import {
  EditorialContainer,
  Eyebrow,
  SectionTitle,
  Lede,
} from "./editorial";

/** Compliance/purpose items preserved from the previous implementation. */
const complianceItems = [
  {
    title: "DepEd Grading & Records Compliance",
    desc: "Aligned with DepEd grading, learner records, and child protection standards.",
  },
  {
    title: "RA 10173 Data Privacy",
    desc: "Built-in privacy controls, role-based access, and audit logging for Data Privacy Act compliance.",
  },
  {
    title: "Interoperable Exports",
    desc: "PDF and Excel reports formatted for school planning, DepEd submissions, and division reporting.",
  },
];

/** User roles preserved from the previous implementation. */
const userRoles = [
  {
    label: "Teachers / Advisers",
    desc: "Record grades, attendance, behavior, and assessments for their advisory sections. Generate section reports.",
  },
  {
    label: "Records & Guidance Personnel",
    desc: "School-wide record keeping: enrollment, verification, assessments, interventions, and consolidated reports.",
  },
  {
    label: "Administrators",
    desc: "Full system access: user management, system settings, audit logs, duplicate resolution.",
  },
];

/**
 * About / purpose section — two editorial layouts per design.md §19/§22:
 * first a large typographic statement (§22), then text-left/detail-right.
 * Flat, borderless, hierarchy through typography and whitespace only.
 */
export function WelcomeAbout() {
  return (
    <section className="bg-white">
      {/* ── Part 1: large typographic statement (design.md §22) ── */}
      <div className="border-b border-brand-200">
        <EditorialContainer className="py-24 md:py-32 lg:py-40">
          <Eyebrow>Purpose</Eyebrow>
          <p className="mt-6 max-w-3xl text-[1.75rem] leading-[1.15] font-normal tracking-[-0.03em] text-brand-950 md:text-[2.25rem] lg:text-[2.75rem]">
            Purpose-built for school governance — the single source of truth
            for learner records in{" "}
            <span className="text-action-700">Sta. Magdalena</span>, supporting
            evidence-based teaching, guidance, and reporting for Grades 7–12.
          </p>
        </EditorialContainer>
      </div>

      {/* ── Part 2: text left / detail right (design.md §19 Layout A) ── */}
      <EditorialContainer className="py-24 md:py-32 lg:py-40">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <Eyebrow>Compliance</Eyebrow>
            <SectionTitle className="mt-4 text-[1.75rem] md:text-[2.25rem]">
              Built around standards, not around trends.
            </SectionTitle>
            <Lede className="mt-6 max-w-[46ch]">
              Every workflow in the system maps to an institutional requirement —
              from enrollment verification to data privacy to interoperable
              reporting.
            </Lede>

            <div className="mt-12 divide-y divide-brand-200 border-y border-brand-200">
              {complianceItems.map((item) => (
                <div key={item.title} className="flex items-start gap-4 py-5">
                  <CheckCircle2
                    className="mt-1 h-4 w-4 shrink-0 text-action-600"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-base font-medium text-brand-950">{item.title}</h3>
                    <p className="mt-1.5 max-w-[44ch] text-sm leading-[1.55] text-brand-500">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Who uses this system — quiet definition list, no box (§49) */}
          <div className="lg:pl-8">
            <Eyebrow>Audience</Eyebrow>
            <h3 className="mt-4 text-xl font-medium tracking-[-0.01em] text-brand-950 md:text-2xl">
              Who uses this system
            </h3>
            <dl className="mt-10 space-y-10">
              {userRoles.map((item) => (
                <div key={item.label} className="border-t border-brand-200 pt-5">
                  <dt className="text-[13px] font-medium uppercase tracking-[0.12em] text-brand-950">
                    {item.label}
                  </dt>
                  <dd className="mt-2 max-w-[42ch] text-[15px] leading-[1.55] text-brand-500">
                    {item.desc}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </EditorialContainer>
    </section>
  );
}
