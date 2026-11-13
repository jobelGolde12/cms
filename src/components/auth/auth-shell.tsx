import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

/**
 * Shared chrome for the public authentication pages (sign-in, password
 * recovery). Keeps the institutional header, page background and content
 * width identical across the flow instead of duplicating the markup in each
 * page — a single place to evolve the auth surface.
 */
export function AuthShell({
  children,
  widthClass = "max-w-[440px]",
}: {
  children: ReactNode;
  widthClass?: string;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-[#F4F7FC]">
      <header className="border-b border-[#DCE4F0] bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-3 md:px-10 lg:px-16">
          <Logo size="lg" asLink priority />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-brand-900">
              Republic of the Philippines
            </p>
            <p className="truncate text-[10px] font-medium text-[#64748B]">
              STA. MAGDALENA NHS • DEPED SORSOGON DIVISION
            </p>
          </div>
        </div>
      </header>

      <div
        className={`mx-auto flex w-full ${widthClass} flex-1 flex-col justify-center px-5 py-10 sm:px-6`}
      >
        {children}
      </div>
    </main>
  );
}
