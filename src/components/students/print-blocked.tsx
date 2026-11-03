import Link from "next/link";
import { Printer } from "lucide-react";
import { RECORD_STATUS_LABELS, type RecordStatus } from "@/lib/constants";
import { EmptyState } from "@/components/ui/states";

/**
 * Shared blocked state for official document previews (Student Card, Report
 * Card, Form 137). Official output prints for `verified` records only
 * (isOfficialPrintEligible in src/lib/workflow.ts) so an incomplete draft
 * can never be rendered as finalized data. The state itself is
 * print-hidden: nothing official is ever rendered from it.
 */
export function OfficialDocumentBlocked({
  studentNumber,
  recordStatus,
  documentName,
}: {
  studentNumber: string;
  recordStatus: string;
  documentName: string;
}) {
  const label =
    RECORD_STATUS_LABELS[recordStatus as RecordStatus] ?? recordStatus;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-action-700">
            Official Document
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-900 sm:text-[28px]">
            {documentName}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            <span className="numeric font-medium text-brand-700">{studentNumber}</span>{" "}
            — record status: {label}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-brand-200 bg-white shadow-xs">
        <EmptyState
          icon={<Printer className="h-10 w-10" />}
          title={`${documentName} is not available yet`}
          description={`This record is still "${label}". Official documents print only for verified records so incomplete draft information is never output as finalized data. Submit the record for verification and, once it is verified, return here to print.`}
        />
      </div>
      <p className="text-center text-xs text-[#64748B]">
        <Link href="/students" className="font-medium text-action-700 hover:text-action-800">
          ← Back to the registry
        </Link>
      </p>
    </div>
  );
}
