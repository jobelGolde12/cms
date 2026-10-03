import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <div className="max-w-md w-full rounded-[3px] border border-brand-200 bg-white p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
        {/* Brand mark — single source of truth (see components/logo.tsx). */}
        <div className="mx-auto mb-4 flex w-fit">
          <Logo size="xl" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-brand-900">Page not found</h1>
        <p className="mt-2 text-sm text-brand-500">
          The page you are looking for doesn&rsquo;t exist or may have been moved.
        </p>
        <Link href="/" className={`mt-6 ${buttonStyles("secondary", "md")}`}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
