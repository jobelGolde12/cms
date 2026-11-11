"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Copy, ShieldCheck } from "lucide-react";
import {
  beginMfaSetup,
  confirmMfaSetup,
  disableMfa,
  regenerateRecoveryCodes,
  type MfaSetupState,
} from "@/actions/mfa";
import type { ActionState } from "@/actions/helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/form-status";
import { buttonStyles } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

const INITIAL_ACTION: ActionState = { ok: false, error: "" };
const INITIAL_SETUP: MfaSetupState = { ok: false, error: "" };

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-2">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <p className="text-sm font-medium text-emerald-900">
          Save these recovery codes now. Each works once and they will never be shown again.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 font-mono text-sm text-brand-900">
        {codes.map((code) => (
          <li key={code} className="rounded border border-emerald-200 bg-white px-2 py-1 text-center">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(codes.join("\n"));
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy codes"}
        </Button>
        <Button type="button" size="sm" onClick={onDone}>
          I have saved them
        </Button>
      </div>
    </div>
  );
}

export function MfaSettings({
  enabled,
  enrolledAt,
}: {
  enabled: boolean;
  enrolledAt: Date | null;
}) {
  const router = useRouter();
  const [setup, setSetup] = useState<MfaSetupState | null>(null);
  const [starting, startTransition] = useTransition();
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const [confirmState, confirmAction, confirmPending] = useActionState(
    async (prev: MfaSetupState, formData: FormData) => {
      const result = await confirmMfaSetup(prev, formData);
      if (result.ok && result.recoveryCodes) {
        setRecoveryCodes(result.recoveryCodes);
        setSetup(null);
        router.refresh();
      }
      return result;
    },
    INITIAL_SETUP,
  );

  const [regenState, regenAction] = useActionState(
    async (prev: MfaSetupState, formData: FormData) => {
      const result = await regenerateRecoveryCodes(prev, formData);
      if (result.ok && result.recoveryCodes) setRecoveryCodes(result.recoveryCodes);
      return result;
    },
    INITIAL_SETUP,
  );

  const [disableState, disableAction] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await disableMfa(prev, formData);
      if (result.ok) {
        setRecoveryCodes(null);
        router.refresh();
      }
      return result;
    },
    INITIAL_ACTION,
  );

  if (enabled) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="verified">Enabled</Badge>
          {enrolledAt ? (
            <span className="text-xs text-[#64748B]">Since {formatDateTime(enrolledAt)}</span>
          ) : null}
        </div>

        {recoveryCodes ? (
          <RecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />
        ) : null}

        <section className="space-y-3 rounded-lg border border-brand-200 p-4">
          <h3 className="text-sm font-semibold text-brand-900">Regenerate recovery codes</h3>
          <p className="text-xs text-[#64748B]">
            Your password and a current authenticator code are required. All previous recovery
            codes stop working immediately.
          </p>
          <form action={regenAction} className="space-y-3">
            {regenState.ok === false && regenState.error ? (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {regenState.error}
              </div>
            ) : null}
            {regenState.ok ? (
              <div role="status" className="text-sm font-medium text-emerald-800">
                {regenState.message}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Current password" htmlFor="regen-password" required>
                <Input id="regen-password" name="password" type="password" autoComplete="current-password" required />
              </Field>
              <Field label="Authenticator code" htmlFor="regen-code" required>
                <Input id="regen-code" name="code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required />
              </Field>
            </div>
            <SubmitButton className={buttonStyles("outline", "md")} pendingLabel="Generating…">
              Generate new recovery codes
            </SubmitButton>
          </form>
        </section>

        <section className="space-y-3 rounded-lg border border-red-200 p-4">
          <h3 className="text-sm font-semibold text-red-800">Disable two-factor authentication</h3>
          <p className="text-xs text-[#64748B]">
            Sign-in will require only your password. Confirm with your password and a current code.
          </p>
          <form action={disableAction} className="space-y-3">
            {disableState.ok === false && disableState.error ? (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {disableState.error}
              </div>
            ) : null}
            {disableState.ok ? (
              <div role="status" className="text-sm font-medium text-emerald-800">
                {disableState.message}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Current password" htmlFor="disable-password" required>
                <Input id="disable-password" name="password" type="password" autoComplete="current-password" required />
              </Field>
              <Field label="Authenticator code" htmlFor="disable-code" required>
                <Input id="disable-code" name="code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required />
              </Field>
            </div>
            <SubmitButton className={buttonStyles("danger", "md")} pendingLabel="Disabling…">
              Disable two-factor authentication
            </SubmitButton>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Not enabled</Badge>
        <span className="text-xs text-[#64748B]">
          Recommended for every administrator and anyone handling sensitive records.
        </span>
      </div>

      {!setup?.ok ? (
        <>
          {setup?.ok === false && setup.error ? (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {setup.error}
            </div>
          ) : null}
          <Button
            type="button"
            disabled={starting}
            onClick={() =>
              startTransition(async () => {
                setSetup(await beginMfaSetup());
              })
            }
          >
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            {starting ? "Preparing…" : "Set up authenticator app"}
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-brand-800">
            <li>Open your authenticator app (Google Authenticator, Microsoft Authenticator, Aegis…).</li>
            <li>Scan this QR code, or enter the setup key manually.</li>
            <li>Enter the 6-digit code the app shows to finish enabling.</li>
          </ol>

          <div className="flex flex-col items-start gap-4 sm:flex-row">
            {setup.qrDataUrl ? (
              // Data URL generated server-side; no external image request.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={setup.qrDataUrl}
                alt="Authenticator setup QR code"
                width={180}
                height={180}
                className="rounded-md border border-brand-200 bg-white p-2"
              />
            ) : null}
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">Setup key</p>
              <code className="block break-all rounded-md border border-brand-200 bg-brand-50 px-3 py-2 font-mono text-xs text-brand-900">
                {setup.secret}
              </code>
            </div>
          </div>

          <form action={confirmAction} className="space-y-3">
            {confirmState.ok === false && confirmState.error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                {confirmState.error}
              </div>
            ) : null}
            <Field
              label="6-digit code"
              htmlFor="mfa-confirm-code"
              required
              hint="The code rotates every 30 seconds."
            >
              <Input
                id="mfa-confirm-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                autoFocus
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <SubmitButton className={buttonStyles("primary", "md")} pendingLabel="Verifying…">
                Verify and enable
              </SubmitButton>
              <Button type="button" variant="outline" onClick={() => setSetup(null)} disabled={confirmPending}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
