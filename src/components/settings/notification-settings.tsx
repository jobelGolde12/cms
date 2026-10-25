"use client";

import { useState } from "react";

/**
 * NotificationSettings — preference toggles (accent blue when on).
 * There is no notification-preferences backend yet, so these are client state
 * with a neutral note; wiring them to a persisted settings key is a
 * straightforward follow-up (a per-user notification-prefs row).
 */
export function NotificationSettings() {
  const toggles = [
    {
      key: "email",
      label: "Email Notifications",
      description: "Receive email when records you own are verified or returned.",
      defaultOn: true,
    },
    {
      key: "reports",
      label: "Report Generation Alerts",
      description: "Notify me when a scheduled report finishes generating.",
      defaultOn: false,
    },
    {
      key: "system",
      label: "System Updates",
      description: "Announcements about maintenance windows and new features.",
      defaultOn: false,
    },
  ] as const;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-brand-100 px-6 py-5">
        <h2 className="text-base font-semibold text-brand-900">Notifications</h2>
        <p className="mt-0.5 text-sm text-[#64748B]">
          Choose what activity you want to be notified about.
        </p>
      </header>

      <div className="flex-1 divide-y divide-brand-100 px-6 py-2">
        {toggles.map((t) => (
          <ToggleRow
            key={t.key}
            id={`notif-${t.key}`}
            label={t.label}
            description={t.description}
            defaultOn={t.defaultOn}
          />
        ))}
      </div>

      <div className="mt-auto border-t border-brand-100 px-6 py-3">
        <p className="text-xs text-[#64748B]">
          Preferences are per-device for now and are not yet saved to your account.
        </p>
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  defaultOn,
}: {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);

  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-brand-900">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-[#64748B]">{description}</p>
      </div>
      {/* Accessible switch built on a checkbox input */}
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600 ${
          on ? "border border-action-600 bg-action-600" : "border border-brand-300 bg-brand-300"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
