import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ShieldCheck,
  BarChart3,
  FileText,
  QrCode,
  ClipboardCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
    title: "Child Registry",
    description:
      "Register and manage comprehensive child profiles with personal details, addresses, education status, ECCD participation, and disability information.",
    icon: ClipboardCheck,
    badge: "Core Feature",
  },
  {
    title: "Record Validation",
    description:
      "Official DepEd Form 1 verification workflow with status tracking — draft, pending validation, needs correction, verified, and duplicate detection.",
    icon: ShieldCheck,
    badge: "Core Feature",
  },
  {
    title: "Monitoring & Interventions",
    description:
      "Track educational status, out-of-school youth, ECCD participation, and disability support. Assign and monitor interventions with follow-up scheduling.",
    icon: BarChart3,
    badge: "Core Feature",
  },
  {
    title: "Reporting & Analytics",
    description:
      "Generate municipal and barangay-level reports: child registry, educational status, out-of-school youth, ECCD, disability, and intervention summaries. Export to PDF, Excel, or CSV.",
    icon: FileText,
    badge: "Core Feature",
  },
  {
    title: "QR Verification",
    description:
      "Generate and scan QR codes for instant child record verification in the field. Secure, offline-capable validation for barangay personnel.",
    icon: QrCode,
    badge: "Field Ready",
  },
  {
    title: "Role-Based Access",
    description:
      "Three-tier permission system: Barangay Users (local data), LGU Users (municipal oversight), System Administrators (full control). Audit logging on all actions.",
    icon: Users,
    badge: "Secure",
  },
];

/**
 * Individual feature card component with refined design.
 */
export function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <Card className="group h-full rounded-2xl border border-brand-200/70 bg-white/80 shadow-sm shadow-brand-100/20 hover:shadow-xl hover:shadow-brand-100/30 hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm">
      <CardBody className="flex flex-col h-full p-7">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-900 to-brand-800 shadow-md shadow-brand-900/10 ring-1 ring-brand-100/60 group-hover:shadow-lg group-hover:shadow-brand-900/15 transition-shadow duration-300">
          <feature.icon className="h-7 w-7 text-white" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2.5 mb-3">
          <h3 className="text-xl font-extrabold text-brand-950 tracking-tight">{feature.title}</h3>
          <Badge tone="neutral" className="text-[10px] uppercase tracking-wide px-2.5 py-0.5 font-semibold shadow-sm">
            {feature.badge}
          </Badge>
        </div>
        <p className="text-[15px] leading-relaxed text-brand-600 flex-1">{feature.description}</p>
      </CardBody>
    </Card>
  );
}

/**
 * Features section with refined cards.
 */
export function WelcomeFeatures() {
  return (
    <section className="py-20 md:py-28 lg:py-36 bg-brand-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-20">
          <h2 className="text-[2rem] font-extrabold tracking-tight text-brand-950 leading-tight md:text-[2.5rem] lg:text-[3rem]">
            System Capabilities
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-brand-600 md:text-xl">
            Purpose-built features for municipal child mapping and DepEd compliance.
          </p>
        </div>

        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
