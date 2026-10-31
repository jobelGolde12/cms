import { Logo } from "@/components/logo";
import { SCHOOL } from "@/lib/constants";

/**
 * Global loading state (root app-router loading boundary).
 *
 * A quiet, card-less editorial composition instead of the previous boxed
 * "modal": the shared brand lockup (single source of truth, see
 * components/logo.tsx), the school identity line, and one indeterminate
 * progress hairline — the same rhythm and hairline geometry the landing page
 * uses. `role="status"` announces the visible copy to assistive tech without
 * a separate visually-hidden label.
 *
 * The progress animation is defined in globals.css (.loader-bar) and is
 * disabled under prefers-reduced-motion, where it renders as a static
 * centered segment.
 */
export default function LoadingState() {
  return (
    <main
      role="status"
      aria-busy="true"
      className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 py-12"
    >
      {/* Institution lockup — same component headers/footers use. */}
      <Logo size="lg" variant="lockup" />

      <p className="eyebrow mt-10 max-w-[28ch] text-center">
        {SCHOOL.shortName} · Records Management System
      </p>

      {/* Indeterminate progress hairline (animation in globals.css). */}
      <div
        aria-hidden="true"
        className="mt-3 h-0.5 w-44 overflow-hidden rounded-full bg-brand-200"
      >
        <div className="loader-bar h-full w-1/3 rounded-full bg-brand-500" />
      </div>

      <p className="mt-4 text-[13px] leading-[1.6] text-[#64748B]">
        Preparing your workspace…
      </p>
    </main>
  );
}
