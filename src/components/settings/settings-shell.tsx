"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, KeyRound, Settings2, UserRound } from "lucide-react";
import { ProfileSettings } from "./profile-settings";
import { SecuritySettings } from "./security-settings";
import { NotificationSettings } from "./notification-settings";

type SectionId = "profile" | "security" | "notifications" | "system";

const NAV: { id: SectionId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "system", label: "System" },
];

const NAV_ICONS: Record<SectionId, ReactNode> = {
  profile: <UserRound aria-hidden="true" className="h-4 w-4" />,
  security: <KeyRound aria-hidden="true" className="h-4 w-4" />,
  notifications: <Bell aria-hidden="true" className="h-4 w-4" />,
  system: <Settings2 aria-hidden="true" className="h-4 w-4" />,
};

/**
 * Two-column settings layout: sticky sub-navigation on the left, the active
 * settings panel on the right. Collapses to a dropdown on small screens.
 * `systemSection` is a server-rendered node (only present for users with
 * `settings.manage`) — when absent the System entry is hidden entirely.
 */
export function SettingsShell({
  firstName,
  lastName,
  email,
  roleLabel,
  systemSection,
}: {
  firstName: string;
  lastName: string;
  email: string;
  roleLabel: string;
  systemSection?: ReactNode;
}) {
  const [active, setActive] = useState<SectionId>("profile");
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close the mobile dropdown when clicking outside.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const items = NAV.filter((n) => n.id !== "system" || systemSection !== undefined);
  const activeItem = items.find((n) => n.id === active) ?? items[0];
  if (activeItem.id !== active) {
    // Active section was hidden (privilege change) — reset deterministically.
    setActive(activeItem.id);
  }

  const panels: Record<SectionId, ReactNode> = {
    profile: (
      <ProfileSettings
        firstName={firstName}
        lastName={lastName}
        email={email}
        roleLabel={roleLabel}
      />
    ),
    security: <SecuritySettings />,
    notifications: <NotificationSettings />,
    system: systemSection,
  };

  const activeLabel = activeItem.label;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Sub-navigation */}
      <nav ref={navRef} aria-label="Settings sections" className="relative lg:sticky lg:top-6">
        {/* Desktop: vertical menu */}
        <div className="hidden lg:block">
          <ul className="rounded-lg border border-brand-200 bg-white p-1.5 shadow-xs">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActive(item.id)}
                  aria-current={active === item.id ? "true" : undefined}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                    active === item.id
                      ? "bg-action-50 text-action-700"
                      : "text-[#263449] hover:bg-[#F4F7FC] hover:text-brand-900"
                  }`}
                >
                  <span className={active === item.id ? "text-action-700" : "text-brand-800"}>
                    {NAV_ICONS[item.id]}
                  </span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile: dropdown menu */}
        <div className="lg:hidden">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-11 w-full items-center justify-between rounded-lg border border-brand-300 bg-white px-3 text-sm font-medium text-brand-900"
          >
            <span className="flex items-center gap-2">
              <span className="text-action-700">{NAV_ICONS[activeItem.id]}</span>
              {activeLabel}
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 text-[#64748B] transition-transform ${menuOpen ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {menuOpen ? (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-brand-200 bg-white p-1.5 shadow-md">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(item.id);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium ${
                      active === item.id
                        ? "bg-action-50 text-action-700"
                        : "text-[#263449] hover:bg-[#F4F7FC]"
                    }`}
                  >
                    {NAV_ICONS[item.id]}
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </nav>

      {/* Active section panel */}
      <section
        aria-label={`${activeLabel} settings`}
        className="min-h-[420px] overflow-hidden rounded-lg border border-brand-200 bg-white shadow-xs"
      >
        {panels[activeItem.id]}
      </section>
    </div>
  );
}
