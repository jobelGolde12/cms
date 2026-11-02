"use client";

import { useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * ClientNavForm — GET search/filter form without a full document reload.
 *
 * The app's server-rendered filter panels previously used native
 * `<form action="/path" method="GET">`, which submits a fresh browser
 * document (full page load, white flash). This client wrapper intercepts
 * the submit event, rebuilds the same GET query from the form's fields and
 * performs a router navigation inside `startTransition`, so:
 *  - navigation is client-side ( skeletons/streamed server components apply ),
 *  - no full-page reload,
 *  - inputs stay in sync with the URL (router.push includes the query).
 *
 * The form's visible fields are passed as `children` from parent Server
 * Components (allowed: server children of a client component), so no list
 * page markup moved into the client bundle.
 *
 * `flashRef` targets (e.g. the form container) briefly dim while the
 * transition is pending, giving the same "filtering…" affordance as the
 * grade-sheet filters.
 */
export function ClientNavForm({
  action,
  children,
  className,
}: {
  /** Absolute app path, e.g. "/students" or "/service-credits". */
  action: string;
  children: ReactNode;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className={className}
      aria-busy={isPending || undefined}
      style={{ opacity: isPending ? 0.6 : undefined }}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const params = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
          if (typeof value === "string" && value.trim() !== "") {
            params.set(key, value.trim());
          }
        }
        const query = params.toString();
        startTransition(() => {
          router.push(query ? `${action}?${query}` : action);
        });
      }}
    >
      {children}
    </form>
  );
}
