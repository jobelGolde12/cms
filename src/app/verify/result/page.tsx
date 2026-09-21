import Link from "next/link";
import { ShieldCheck, AlertCircle } from "lucide-react";

export default async function VerifyResultPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-200 bg-white shadow-xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-white shadow-md">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-extrabold text-brand-900">Verification</h1>
        <p className="mt-3 text-sm text-brand-600">Token: <span className="font-mono text-brand-800">{token || "—"}</span></p>
        <p className="mt-4 text-xs text-brand-400">Public verification shows only minimal permitted information.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800">Go Home</Link>
      </div>
    </main>
  );
}
