import {
  Users,
  ShieldCheck,
  BarChart3,
  FileText,
  QrCode,
  ClipboardCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  EditorialContainer,
  Eyebrow,
  SectionTitle,
  Lede,
} from "./editorial";

/** Feature item for the system capabilities grid. */
export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  badge: string;
}

/**
 * Data-driven feature items derived from actual system capabilities.
 */
export const features: Feature[] = [
  {
    title: "Student Registry",
    description:
      "Register and manage comprehensive student profiles with personal details, guardians, addresses, and contact information — the school's single source of truth.",
    icon: ClipboardCheck,
    badge: "Core Feature",
  },
  {
    title: "Record Verification",
    description:
      "Verification workflow with status tracking — draft, pending verification, needs correction, verified, and duplicate detection. Verified records unlock QR codes.",
    icon: ShieldCheck,
    badge: "Core Feature",
  },
  {
    title: "Student Development",
    description:
      "Track reading, literacy, and numeracy assessments, behavior records, and interventions with follow-up scheduling for holistic learner support.",
    icon: BarChart3,
    badge: "Core Feature",
  },
  {
    title: "Performance Analytics",
    description:
      "Grade and attendance analytics by subject, grading period, section, and grade level. Identify failing grades early and generate intervention lists. Export to PDF or Excel.",
    icon: FileText,
    badge: "Core Feature",
  },
  {
    title: "QR Verification",
    description:
      "Generate and scan QR codes for instant student record verification. Secure, offline-capable validation for school personnel.",
    icon: QrCode,
    badge: "Field Ready",
  },
  {
    title: "Role-Based Access",
    description:
      "Five school roles: System Administrator, School Administrator, Teacher/Adviser, Records, and Guidance personnel. Advisers see their own sections. Audit logging on all actions.",
    icon: Users,
    badge: "Secure",
  },
];

/**
 * Individual capability card — compact, Notion-inspired treatment: white
 * surface on a tinted section background, soft radius, hairline border with
 * a readable hover lift. Icon sits inside a quiet tinted tile; the metadata
 * badge balances the top row. (design.md §49 was the previous flat language;
 * this pass reinterprets it with cards while keeping the institutional tone.)
 */
export function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <article className="reveal group rounded-xl border border-brand-100 bg-white p-6 transition-[border-color,box-shadow] duration-300 hover:border-brand-200 hover:shadow-[0_8px_24px_rgba(7,22,62,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light transition-colors duration-300 group-hover:bg-brand-200/70">
          <Icon
            className="h-4.5 w-4.5 text-brand-600"
            aria-hidden="true"
          />
        </span>
        <span className="text-[9px] font-bold tracking-[0.11em] text-brand-400">
          {feature.badge}
        </span>
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-[-0.01em] text-brand-950">
        {feature.title}
      </h3>
      <p className="mt-2 text-[14px] leading-[1.6] text-[#64748B]">
        {feature.description}
      </p>
    </article>
  );
}

/**
 * Capabilities section — tinted band with a grid of compact white cards,
 * generous whitespace, and quiet metadata.
 */
export function WelcomeFeatures() {
  return (
    <section className="border-y border-brand-200 bg-brand-50/50 py-24 md:py-32 lg:py-40">
      <EditorialContainer>
        <div className="reveal grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <Eyebrow>Capabilities</Eyebrow>
            <SectionTitle className="mt-4">What the system does.</SectionTitle>
          </div>
          <div className="md:col-span-5">
            <Lede>
              Purpose-built features for school records management and DepEd
              compliance.
            </Lede>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 md:mt-16 lg:grid-cols-3 lg:gap-5">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </EditorialContainer>
    </section>
  );
}
