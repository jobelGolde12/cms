import Link from "next/link";
import { Bell, CircleCheck, GraduationCap, Search } from "lucide-react";
import { unreadNotificationCount } from "@/lib/queries";
import { hasPermission, type Permission } from "@/lib/permissions";
import { SCHOOL, ROLE_LABELS } from "@/lib/constants";
import { Logo } from "./logo";
import { MobileNavToggle } from "./mobile-nav-toggle";
import { SidebarNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";
import { Tooltip } from "@/components/ui/tooltip";
import type { SessionUser } from "@/lib/auth";

type NavLink = {
  label: string;
  href: string;
  icon: string; // icon NAME — resolved to a component on the client (see nav-icons.tsx)
  permission: Permission;
};

const navLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", permission: "dashboard.view" },
  { label: "Students", href: "/students", icon: "students", permission: "students.view" },
  { label: "Performance", href: "/performance", icon: "performance", permission: "grades.view" },
  { label: "Student Development", href: "/development", icon: "development", permission: "behavior.view" },
  { label: "Verification", href: "/verification", icon: "verification", permission: "verification.review" },
  { label: "Duplicate Review", href: "/duplicates", icon: "duplicates", permission: "duplicates.view" },
  { label: "Reports", href: "/reports", icon: "reports", permission: "reports.view" },
  { label: "QR Studio", href: "/qr", icon: "qr", permission: "qr.verify" },
  { label: "Activity Logs", href: "/activity-logs", icon: "activity", permission: "audit_logs.view" },
  { label: "Notifications", href: "/notifications", icon: "notifications", permission: "students.view" },
  { label: "Users", href: "/users", icon: "users", permission: "users.view" },
  { label: "Settings", href: "/settings", icon: "settings", permission: "dashboard.view" },
];

const NAV_SECTIONS: { heading: string; items: string[] }[] = [
  { heading: "Core Modules", items: ["/dashboard", "/students", "/performance", "/development", "/verification", "/duplicates", "/reports"] },
  { heading: "Operations & Tools", items: ["/qr", "/activity-logs", "/notifications"] },
  { heading: "System", items: ["/users", "/settings"] },
];

export default async function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const visibleLinks = navLinks.filter((link) => hasPermission(user.role, link.permission));
  const unread = await unreadNotificationCount(user.id);

  return (
    <div className="min-h-screen bg-[#f5f7fc]">
      {/* ------------------------------ Sidebar ------------------------------ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#e5e7eb] bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] px-5 py-4">
          {/* Brand mark — single source of truth (see components/logo.tsx). */}
          <Logo size="lg" asLink priority />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-xs font-bold uppercase tracking-wide text-brand-900">
              {SCHOOL.shortName}
            </div>
            <div className="text-[11px] font-medium text-brand-500">Records Management</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-400">
              {SCHOOL.region}
            </div>
          </div>
        </div>

        <SidebarNav sections={NAV_SECTIONS} links={visibleLinks} />

        <div className="border-t border-[#e5e7eb] px-5 py-3 text-[11px] leading-snug text-brand-400">
          <div className="font-semibold text-brand-700">
            {user.firstName} {user.lastName}
          </div>
          <div>{ROLE_LABELS[user.role]}</div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-60">
        {/* ------------------------------ Header ------------------------------ */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
          <MobileNavToggle sections={NAV_SECTIONS} links={visibleLinks} />

          <div className="flex min-w-0 items-center gap-2">
            <Logo size="md" className="lg:hidden" asLink priority />
            <h1 className="truncate text-sm font-semibold text-brand-900 sm:text-base">
              Records Management System
            </h1>
            <span className="hidden items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600 md:inline-flex">
              <GraduationCap aria-hidden="true" className="h-3 w-3" />
              {SCHOOL.shortName}
            </span>
          </div>

          {/* Search (links into the registry search) */}
          <form action="/students" className="ml-2 hidden min-w-0 flex-1 max-w-sm lg:block" role="search">
            <label htmlFor="global-search" className="sr-only">
              Search students in the registry
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-400"
              />
              <input
                id="global-search"
                type="search"
                name="q"
                placeholder="Search students, numbers…"
                className="h-8 w-full rounded-md border border-brand-200 bg-[#f8fafc] pl-8 pr-3 text-xs text-brand-800 placeholder:text-brand-400 focus:border-action-500 focus:bg-white focus:outline-none"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <span className="hidden items-center gap-1.5 text-[11px] font-medium text-emerald-700 sm:inline-flex">
              <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" />
              System Online
            </span>

            <Tooltip content={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}>
              <Link
                href="/notifications"
                aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
                className="relative rounded-md p-2 text-brand-600 transition-all duration-150 hover:bg-brand-100 hover:text-brand-900 hover:scale-105 active:scale-95"
              >
                <Bell aria-hidden="true" className="h-4.5 w-4.5" />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 flex h-2 w-2 transition-transform duration-150 hover:scale-125">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-action-600 animate-pulse" />
                  </span>
                ) : null}
              </Link>
            </Tooltip>

            <Link
              href="/settings"
              aria-label="Help and settings"
              className="hidden rounded-md px-2 py-2 text-[11px] font-medium text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-900 sm:inline-flex"
            >
              Help
            </Link>

            <div className="hidden h-8 w-px bg-brand-200 sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="hidden text-right leading-tight sm:block">
                <div className="max-w-[160px] truncate text-xs font-semibold text-brand-900">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[11px] text-brand-500">{ROLE_LABELS[user.role]}</div>
              </div>
              <div
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-xs font-bold text-white"
              >
                {(user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase()}
              </div>
            </div>

            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        <footer className="border-t border-brand-200/70 px-4 py-4 text-center text-[11px] text-brand-400 sm:px-6">
          {SCHOOL.name} • {SCHOOL.address} • {SCHOOL.region}
        </footer>
      </div>
    </div>
  );
}
