import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

/**
 * Public QR verification entry point. Uses the same institutional card style
 * as the login/register pages (square corners, hairline border, quiet shadow).
 */
export default async function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md rounded-[3px] border border-brand-200 bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[3px] border border-brand-200">
            <Logo size="lg" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-brand-900">QR Verification</h1>
          <p className="mt-2 text-sm text-brand-500">
            Enter a verification token or scan a QR code to confirm a child
            record is registered with the municipality.
          </p>
        </div>
        <form className="flex flex-col gap-3" action="/verify/result" method="GET">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="verify-token" className="text-sm font-medium text-brand-800">
              Verification token
            </label>
            <input
              id="verify-token"
              name="token"
              required
              placeholder="Paste the code from the QR label"
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full rounded-[3px] border border-brand-300 bg-white px-3 text-sm text-brand-950 placeholder:text-brand-400 transition-colors focus:border-action-600 focus:outline-none focus:ring-2 focus:ring-action-600/20"
            />
          </div>
          <Button type="submit" size="md" className="w-full">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Verify
          </Button>
        </form>
        <p className="mt-5 text-center text-xs text-brand-400">
          Only minimum information is shown for privacy.
        </p>
      </div>
    </main>
  );
}
