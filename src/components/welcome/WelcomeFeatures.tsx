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
 * Each item uses real features from the Child Mapping System.
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
 * Individual feature card component with icon, title, badge, and description.
 */
export function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-200">
      <CardBody className="flex flex-col h-full p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-action-50">
          <feature.icon className="h-6 w-6 text-action-700" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-brand-900">{feature.title}</h3>
          <Badge tone="neutral" className="text-xs">
            {feature.badge}
          </Badge>
        </div>
        <p className="text-sm text-brand-600 flex-1">{feature.description}</p>
      </CardBody>
    </Card>
  );
}

/**
 * Features section with data-driven grid layout.
 */
export function WelcomeFeatures() {
  return (
    <section className="py-16 md:py-24 bg-brand-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-brand-950 md:text-4xl">
            System Capabilities
          </h2>
          <p className="mt-4 text-lg text-brand-600">
            Purpose-built features for municipal child mapping and DepEd compliance.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}