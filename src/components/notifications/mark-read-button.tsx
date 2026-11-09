"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { markNotificationsRead } from "@/actions/notifications";
import { cn } from "@/lib/utils";

/**
 * Per-notification "mark as read" control. The server action already existed
 * (`markNotificationsRead`) but the center only offered "mark all" — individual
 * items now dismiss their unread state without clearing the rest.
 */
export function MarkNotificationReadButton({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Mark notification as read"
      onClick={() =>
        startTransition(async () => {
          await markNotificationsRead({ ok: false, error: "" }, [id]);
          router.refresh();
        })
      }
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-200 bg-white px-2 py-1 text-[11px] font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
      ) : (
        <Check aria-hidden="true" className="h-3 w-3" />
      )}
      Mark read
    </button>
  );
}
