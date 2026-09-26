import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CopyCheck,
  FileCheck,
  GitCompare,
  History,
  Scale,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { cn, ageFromBirthDate, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { DuplicateItem, ValidationStats } from "@/lib/queries";
import {
  DUPLICATE_STATUS_LABELS,
  EDUCATION_STATUS_LABELS,
  type DuplicateStatus,
  type EducationStatus,
} from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  Page header                                                               */
/* -------------------------------------------------------------------------- */

export function ValidationPageHeader({ stats }: { stats: ValidationStats }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
          Validation Control Center
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[32px] sm:leading-tight">
          Validation &amp; Duplicate Review
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-500">
          Review submitted child records, resolve algorithmic duplicate
          conflicts, and verify demographics before records are confirmed for
          municipal reporting.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-700">
          <CopyCheck aria-hidden="true" className="h-3.5 w-3.5 text-action-700" />
          {stats.duplicateFlags} active conflict{stats.duplicateFlags === 1 ? "" : "s"}
        </span>
        <Link
          href="/activity-logs"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-200 bg-white px-3.5 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
        >
          <History aria-hidden="true" className="h-4 w-4" />
          Audit Log
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  KPI cards                                                                 */
/* -------------------------------------------------------------------------- */

const KPI_ICONS = {
  duplicates: CopyCheck,
  pending: ClipboardCheck,
  correction: AlertTriangle,
  verified: FileCheck,
} as const;

const KPI_ICON_STYLES = {
  duplicates: "text-red-700 bg-red-100",
  pending: "text-sky-700 bg-sky-100",
  correction: "text-amber-700 bg-amber-100",
  verified: "text-emerald-700 bg-emerald-100",
} as const;

export function ValidationKpiGrid({ stats }: { stats: ValidationStats }) {
  const dupTotal = Math.max(1, stats.duplicateFlags);
  const total = Math.max(1, stats.totalActive);
  const cards = [
    {
      icon: "duplicates" as const,
      label: "Potential Duplicates Flagged",
      value: stats.duplicateFlags,
      supporting: `${stats.highConfidence} high · ${stats.moderate} moderate · ${stats.reviewBand} review`,
      progress: Math.round((stats.highConfidence / dupTotal) * 100),
      bar: "bg-red-500",
    },
    {
      icon: "pending" as const,
      label: "Pending Initial Review",
      value: stats.pendingReview,
      supporting: "Records awaiting validation",
      progress: Math.round((stats.pendingReview / total) * 100),
      bar: "bg-sky-500",
    },
    {
      icon: "correction" as const,
      label: "Returned for Correction",
      value: stats.returnedForCorrection,
      supporting: "Needs field correction",
      progress: Math.round((stats.returnedForCorrection / total) * 100),
      bar: "bg-amber-500",
    },
    {
      icon: "verified" as const,
      label: "Validated Records",
      value: stats.verified,
      supporting: `${Math.round((stats.verified / total) * 100)}% of active records`,
      progress: Math.round((stats.verified / total) * 100),
      bar: "bg-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = KPI_ICONS[card.icon];
        return (
          <article
            key={card.label}
            className="rounded-lg border border-brand-200 bg-white px-4 py-3.5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                {card.label}
              </h3>
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  KPI_ICON_STYLES[card.icon],
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="numeric mt-1.5 text-3xl font-bold tracking-tight text-brand-900">
              {card.value.toLocaleString("en-PH")}
            </p>
            <p className="mt-0.5 truncate text-xs text-brand-500">{card.supporting}</p>
            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-brand-100">
              <div
                className={cn("h-full rounded-full", card.bar)}
                style={{ width: `${Math.min(100, Math.max(2, card.progress))}%` }}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Match explanation helpers — driven by the real detector's reasons         */
/* -------------------------------------------------------------------------- */

const REASON_LABELS: Record<string, string> = {
  name: "Exact name match",
  middle_name: "Middle name matches",
  birth_date: "Exact date of birth match",
  barangay: "Same barangay of residence",
};

const REASON_WEIGHTS: Record<string, number> = {
  name: 40,
  middle_name: 10,
  birth_date: 35,
  barangay: 15,
};

export function MatchEvidence({ item }: { item: DuplicateItem }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-brand-400">
        Matching evidence
      </h4>
      <ul className="mt-2 space-y-1.5">
        {item.matchReasons.map((reason) => {
          const known = reason in REASON_LABELS;
          return (
            <li key={reason} className="flex items-center gap-2 text-xs">
              {known ? (
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              )}
              <span className="text-brand-700">
                {REASON_LABELS[reason] ?? reason.replace(/_/g, " ")}
              </span>
              {known ? (
                <span className="numeric ml-auto text-[11px] text-brand-400">
                  +{REASON_WEIGHTS[reason]} pts
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Side-by-side record comparison                                            */
/* -------------------------------------------------------------------------- */

function sexLabel(sex: string | null) {
  return sex === "male" ? "M" : sex === "female" ? "F" : "—";
}

type Side = {
  code: string;
  name: string;
  birth: string;
  sex: string | null;
  barangay: string | null;
  school: string | null;
  grade: string | null;
  edu: string | null;
  registered: Date | null;
  href: string;
};

function FieldBlock({
  label,
  base,
  incoming,
  state,
  note,
}: {
  label: string;
  base: React.ReactNode;
  incoming: React.ReactNode;
  state: "match" | "difference" | "unavailable";
  note?: string;
}) {
  const styles = {
    match: "border-emerald-100 bg-emerald-50/60",
    difference: "border-amber-200 bg-amber-50/60",
    unavailable: "border-brand-100 bg-brand-50/60",
  }[state];
  const dot = {
    match: "bg-emerald-500",
    difference: "bg-amber-500",
    unavailable: "bg-brand-300",
  }[state];
  const stateLabel = { match: "Match", difference: "Difference", unavailable: "Unavailable" }[state];

  return (
    <div className={cn("rounded-md border px-3 py-2.5", styles)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-brand-500">
          {label}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-brand-500">
          <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          {stateLabel}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">Base</div>
          <div className="text-[13px] font-medium text-brand-900">{base}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">Candidate</div>
          <div className="text-[13px] font-medium text-brand-900">{incoming}</div>
        </div>
      </div>
      {note ? <p className="mt-1.5 text-[11px] text-brand-500">{note}</p> : null}
    </div>
  );
}

function compareState(a: unknown, b: unknown): "match" | "difference" | "unavailable" {
  if (a == null || b == null || a === "" || b === "") return "unavailable";
  return String(a) === String(b) ? "match" : "difference";
}

export function RecordComparison({ item }: { item: DuplicateItem }) {
  const base: Side = {
    code: item.childCode,
    name: `${item.childLast}, ${item.childFirst}`,
    birth: item.childBirth,
    sex: item.childSex,
    barangay: item.childBarangayName,
    school: item.childSchool,
    grade: item.childGrade,
    edu: item.childEduStatus,
    registered: item.childCreatedAt,
    href: `/children/${item.childId}`,
  };
  const incoming: Side = {
    code: item.possibleCode,
    name: `${item.possibleLast}, ${item.possibleFirst}`,
    birth: item.possibleBirth,
    sex: item.possibleSex,
    barangay: item.possibleBarangayName,
    school: item.possibleSchool,
    grade: item.possibleGrade,
    edu: item.possibleEduStatus,
    registered: item.possibleCreatedAt,
    href: `/children/${item.possibleChildId}`,
  };

  const eduLabel = (s: string | null) =>
    s ? (EDUCATION_STATUS_LABELS[s as EducationStatus] ?? s) : null;

  return (
    <div className="space-y-2.5">
      <FieldBlock
        label="Mapping ID"
        base={<span className="numeric">{base.code}</span>}
        incoming={<span className="numeric">{incoming.code}</span>}
        state="match"
        note="IDs always differ — they are generated per intake, not compared."
      />
      <FieldBlock
        label="Full Name"
        base={base.name}
        incoming={incoming.name}
        state={compareState(
          normalizeFullName(item.childLast, item.childFirst),
          normalizeFullName(item.possibleLast, item.possibleFirst),
        )}
      />
      <FieldBlock
        label="Date of Birth & Sex"
        base={`${formatDate(base.birth)} · ${sexLabel(base.sex)}`}
        incoming={`${formatDate(incoming.birth)} · ${sexLabel(incoming.sex)}`}
        state={compareState(base.birth, incoming.birth)}
        note={
          base.birth === incoming.birth
            ? `Exact DOB match — age ${ageFromBirthDate(base.birth) ?? "—"}`
            : `DOB differs — ages ${ageFromBirthDate(base.birth) ?? "—"} vs ${ageFromBirthDate(incoming.birth) ?? "—"}`
        }
      />
      <FieldBlock
        label="Barangay of Residence"
        base={base.barangay ?? "—"}
        incoming={incoming.barangay ?? "—"}
        state={compareState(base.barangay, incoming.barangay)}
        note={
          base.barangay !== incoming.barangay
            ? "Cross-barangay candidate — verify residence before deciding."
            : undefined
        }
      />
      <FieldBlock
        label="School & Grade"
        base={base.school ? `${base.school}${base.grade ? ` · ${base.grade}` : ""}` : eduLabel(base.edu) ?? "No current record"}
        incoming={
          incoming.school
            ? `${incoming.school}${incoming.grade ? ` · ${incoming.grade}` : ""}`
            : eduLabel(incoming.edu) ?? "No current record"
        }
        state={compareState(base.school, incoming.school)}
      />
      <FieldBlock
        label="Registered On"
        base={base.registered ? formatDate(base.registered.toISOString().slice(0, 10)) : "—"}
        incoming={incoming.registered ? formatDate(incoming.registered.toISOString().slice(0, 10)) : "—"}
        state="match"
        note={
          base.registered && incoming.registered
            ? base.registered < incoming.registered
              ? "Base record is older — on confirm, the candidate record is marked as the duplicate."
              : "Candidate record is older — on confirm, the base record is marked as the duplicate."
            : undefined
        }
      />
    </div>
  );
}

function normalizeFullName(last: string, first: string): string {
  return `${last.trim().toLowerCase()} ${first.trim().toLowerCase()}`;
}

/* -------------------------------------------------------------------------- */
/*  Resolution decision explainer                                             */
/* -------------------------------------------------------------------------- */

export function ResolutionExplainer() {
  return (
    <div className="rounded-md border border-brand-100 bg-brand-50/60 px-3 py-2.5">
      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
        <Scale aria-hidden="true" className="h-3.5 w-3.5" />
        What each decision does
      </h4>
      <ul className="mt-1.5 grid grid-cols-1 gap-1 text-[11px] leading-relaxed text-brand-600 sm:grid-cols-3">
        <li>
          <strong className="text-brand-800">Confirm duplicate:</strong> the newer
          record is marked as a duplicate and hidden from the registry.
        </li>
        <li>
          <strong className="text-brand-800">Not a duplicate:</strong> both records
          are cleared and remain in the registry.
        </li>
        <li>
          <strong className="text-brand-800">Dismiss:</strong> closes the review
          without changing either record.
        </li>
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status badge                                                              */
/* -------------------------------------------------------------------------- */

export function DuplicateStatusBadge({ status }: { status: string }) {
  const tone =
    status === "pending"
      ? "pending"
      : status === "confirmed_duplicate"
        ? "error"
        : status === "not_duplicate"
          ? "verified"
          : "neutral";
  return (
    <Badge tone={tone}>{DUPLICATE_STATUS_LABELS[status as DuplicateStatus] ?? status}</Badge>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small shared bits                                                         */
/* -------------------------------------------------------------------------- */

export function ConfidenceChip({ score }: { score: number | null }) {
  if (score == null) return null;
  const band =
    score >= 90
      ? { label: "High", cls: "bg-red-50 text-red-700 border-red-200" }
      : score >= 65
        ? { label: "Moderate", cls: "bg-amber-50 text-amber-700 border-amber-200" }
        : { label: "Review", cls: "bg-brand-50 text-brand-600 border-brand-200" };
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold",
        band.cls,
      )}
    >
      <span className="numeric">{score}%</span> {band.label}
    </span>
  );
}

export function WorkspaceHint({ icon: Icon, children }: { icon: typeof GitCompare; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <Icon aria-hidden="true" className="h-10 w-10 text-brand-300" />
      <p className="max-w-sm text-sm text-brand-500">{children}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-action-700">
        Select a conflict from the queue <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

export { XCircle, Clock, ShieldCheck, GitCompare };
