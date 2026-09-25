import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  FileWarning,
  SendHorizonal,
  ShieldCheck,
  TriangleAlert,
  Archive,
} from "lucide-react";
import type { RecordStatus } from "@/lib/constants";
import { RECORD_STATUS_LABELS } from "@/lib/constants";

type Tone = "verified" | "pending" | "error" | "info" | "neutral";

const tones: Record<Tone, string> = {
  verified: "bg-emerald-50 text-emerald-800 border-emerald-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  error: "bg-red-50 text-red-800 border-red-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
  neutral: "bg-brand-100 text-brand-700 border-brand-200",
};

const icons: Record<Tone, ReactNode> = {
  verified: <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />,
  pending: <Clock aria-hidden="true" className="h-3.5 w-3.5" />,
  error: <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />,
  info: <CircleDashed aria-hidden="true" className="h-3.5 w-3.5" />,
  neutral: <CircleDashed aria-hidden="true" className="h-3.5 w-3.5" />,
};

export function Badge({
  tone = "neutral",
  icon = true,
  children,
  className,
}: {
  tone?: Tone;
  icon?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {icon ? icons[tone] : null}
      {children}
    </span>
  );
}

const recordTone: Record<RecordStatus, Tone> = {
  draft: "neutral",
  pending_validation: "pending",
  needs_correction: "error",
  verified: "verified",
  marked_duplicate: "error",
};

export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  const tone = recordTone[status] ?? "neutral";
  const Icon = status === "verified" ? ShieldCheck : status === "draft" ? FileWarning : undefined;
  return (
    <Badge tone={tone}>
      {Icon ? <Icon aria-hidden="true" className="h-3.5 w-3.5" /> : null}
      {RECORD_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export { SendHorizonal, ShieldCheck, Archive };
