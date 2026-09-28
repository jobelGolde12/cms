import { Logo } from "@/components/logo";

export default function LoadingState() {
  return (
    <main className="min-h-screen bg-brand-50 px-4 py-12 flex items-center justify-center">
      <div className="max-w-md w-full rounded-2xl border border-brand-200 bg-white shadow-xl p-8 text-center">
        {/* Brand mark — single source of truth (see components/logo.tsx). */}
        <div className="mb-4 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="h-2 w-24 bg-brand-200 rounded mx-auto mb-4 animate-pulse" />
        <div className="h-4 w-40 bg-brand-100 rounded mx-auto" />
      </div>
    </main>
  );
}
