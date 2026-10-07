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
 * Individual capability item — flat editorial treatment (design.md §49: no
 * rounded cards as the default language). A small line icon, quiet metadata
 * label, and hairline divider carry the structure instead of boxes.
 */
export function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <article className="group border-t border-brand-200 pt-8">
      <div className="flex items-center justify-between gap-3">
        <Icon
          className="h-5 w-5 text-brand-400 transition-colors duration-300 group-hover:text-action-600"
          aria-hidden="true"
        />
        <span className="eyebrow">{feature.badge}</span>
      </div>
      <h3 className="mt-5 text-lg font-medium tracking-[-0.01em] text-brand-950">
        {feature.title}
      </h3>
      <p className="mt-3 text-[15px] leading-[1.55] text-brand-500">
        {feature.description}
      </p>
    </article>
  );
}

/**
 * Capabilities section — editorial grid with hairline dividers, generous
 * whitespace, and quiet metadata. No cards, no shadows (design.md §18–20).
 */
export function WelcomeFeatures() {
  return (
    <section className="border-y border-brand-200 bg-brand-50/40 py-24 md:py-32 lg:py-40">
      <EditorialContainer>
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
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

        <div className="mt-16 grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3 md:mt-20">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </EditorialContainer>
    </section>
  );
}
