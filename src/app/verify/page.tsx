import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default async function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-200 bg-white shadow-xl p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-white shadow-md">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-brand-900">QR Verification</h1>
          <p className="mt-2 text-sm text-brand-500">Enter a verification token or scan a QR code.</p>
        </div>
        <form className="flex flex-col gap-3" action="/verify/result" method="GET">
          <input
            name="token"
            placeholder="Verification token"
            className="w-full rounded-lg border border-brand-300 px-4 py-2.5 text-base sm:text-sm text-brand-900 focus:outline-none focus:ring-2 focus:ring-action-600/40 bg-white"
          />
          <button type="submit" className="rounded-lg bg-action-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-action-800 shadow-sm">
            Verify
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-brand-400">
          Only minimum information is shown for privacy.
        </p>
      </div>
    </main>
  );
}
