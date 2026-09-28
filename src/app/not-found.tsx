import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-brand-200 bg-white shadow-xl p-8 text-center">
        {/* Brand mark — single source of truth (see components/logo.tsx). */}
        <div className="mx-auto mb-4 flex w-fit">
          <Logo size="xl" />
        </div>
        <h1 className="text-xl font-extrabold text-brand-900 mb-2">Page not found</h1>
        <p className="text-brand-500">The page you are looking for does not exist.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
