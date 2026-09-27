"use client";

import { archiveChildForm } from "@/actions/children";

/**
 * Archive (soft delete) control for the child profile page.
 * Uses a server action (`archiveChildForm` → `archiveChild`) which re-checks
 * permission and scope; the record is retained (status → archived) and its
 * QR tokens are revoked. Confirmation prevents accidental clicks.
 */
export function ArchiveChildButton({ childId, childCode }: { childId: string; childCode: string }) {
  return (
    <form
      action={archiveChildForm}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Archive record ${childCode}? It will be hidden from active lists and its QR codes revoked. History is retained.`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className="inline-flex"
    >
      <input type="hidden" name="childId" value={childId} />
      <button
        type="submit"
        className="inline-flex h-8 items-center rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
      >
        Archive
      </button>
    </form>
  );
}
