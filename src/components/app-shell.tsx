import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { unreadNotificationCount } from "@/lib/queries";
import { hasPermission, type Permission } from "@/lib/permissions";
import { canViewConfidentialBehavior } from "@/lib/scope";
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
  { label: "Grade Encoding", href: "/grades", icon: "grades", permission: "grades.view" },
  { label: "Employees", href: "/employees", icon: "employees", permission: "employees.view" },
  { label: "Service Credits", href: "/service-credits", icon: "service_credits", permission: "service_credits.view" },
  { label: "Performance", href: "/performance", icon: "performance", permission: "grades.view" },
  { label: "Student Development", href: "/development", icon: "development", permission: "behavior.view" },
  { label: "Guidance Office", href: "/guidance", icon: "guidance", permission: "behavior.view" },
  { label: "Health & Nutrition", href: "/health", icon: "health", permission: "health.view" },
  { label: "Verification", href: "/verification", icon: "verification", permission: "verification.review" },
  { label: "Duplicate Review", href: "/duplicates", icon: "duplicates", permission: "duplicates.view" },
  { label: "Reports", href: "/reports", icon: "reports", permission: "reports.view" },
  { label: "QR Studio", href: "/qr", icon: "qr", permission: "qr.verify" },
  { label: "Activity Logs", href: "/activity-logs", icon: "activity", permission: "audit_logs.view" },
  { label: "Notifications", href: "/notifications", icon: "notifications", permission: "dashboard.view" },
  { label: "Users", href: "/users", icon: "users", permission: "users.view" },
  { label: "Privacy Policy", href: "/privacy", icon: "verification", permission: "dashboard.view" },
  { label: "Settings", href: "/settings", icon: "settings", permission: "dashboard.view" },
];

const NAV_SECTIONS: { heading: string; items: string[] }[] = [
  { heading: "Core Modules", items: ["/dashboard", "/students", "/grades", "/performance", "/development", "/guidance", "/health", "/verification", "/duplicates", "/reports"] },
  { heading: "Employee Records", items: ["/employees", "/service-credits"] },
  { heading: "Operations & Tools", items: ["/qr", "/activity-logs", "/notifications"] },
  { heading: "System", items: ["/users", "/settings", "/privacy"] },
];

export default async function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const visibleLinks = navLinks.filter(
    (link) =>
      hasPermission(user.role, link.permission) &&
      // Confidential Guidance Office module: only guidance + admin-tier roles
      // even see the link (teacher/adviser views never show incident data).
      (link.href !== "/guidance" || canViewConfidentialBehavior(user)),
  );
  const unread = await unreadNotificationCount(user.id);

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Skip-to-content (WCAG 2.1 AA): first focusable element, becomes visible on focus. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      {/* ------------------------------ Sidebar ------------------------------ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-brand-800/40 bg-brand-900 lg:flex print:hidden">
        <div className="border-b border-white/10 px-5 py-5">
          {/* Brand mark — single source of truth (see components/logo.tsx). */}
          <Logo size="lg" asLink priority tone="onDark" />
          <div className="mt-3 leading-snug">
            <div className="text-[13px] font-semibold text-white">
              Sta. Magdalena<br />National High School
            </div>
            <div className="mt-1 text-xs text-[#AFC4FF]">Records Management</div>
            <div className="mt-2 text-[10px] font-medium uppercase tracking-widest text-[#7EA2FF]/70">
              {SCHOOL.region}
            </div>
          </div>
        </div>

        <SidebarNav sections={NAV_SECTIONS} links={visibleLinks} />

        <div className="border-t border-white/10 px-5 py-3.5 text-[11px] leading-snug">
          <div className="font-semibold text-white">
            {user.firstName} {user.lastName}
          </div>
          <div className="mt-0.5 text-[#AFC4FF]">{ROLE_LABELS[user.role]}</div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-60">
        {/* ------------------------------ Header ------------------------------ */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-brand-200 bg-white px-3 sm:px-4 md:h-16 md:px-6 print:hidden">
          <MobileNavToggle sections={NAV_SECTIONS} links={visibleLinks} />

          <div className="flex min-w-0 items-center gap-2">
            <Logo size="md" className="lg:hidden" asLink priority />
            <h1 className="truncate text-sm font-semibold text-brand-900 sm:text-base md:text-lg">Dashboard</h1>
          </div>

          {/* Search (links into the registry search; hidden for roles without students.view) */}
          {hasPermission(user.role, "students.view") ? (
            <form action="/students" className="ml-2 hidden min-w-0 flex-1 max-w-xs lg:block" role="search">
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
                autoComplete="off"
                className="h-8 w-full rounded-md border border-brand-100 bg-brand-50/60 pl-8 pr-3 text-xs text-brand-800 placeholder:text-brand-400/70 focus:border-action-500 focus:bg-white focus:outline-none"
              />
            </div>
          </form>
          ) : null}

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <span className="hidden items-center gap-2 px-2 text-[11px] font-medium text-[#64748B] sm:inline-flex">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-success"
              />
              System Online
            </span>

            <Tooltip content={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`} className="inline-flex">
              <Link
                href="/notifications"
                aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-brand-600 transition-colors duration-150 hover:bg-brand-100 hover:text-brand-900"
              >
                <Bell aria-hidden="true" className="h-4.5 w-4.5" />
                {unread > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-action-600"
                  />
                ) : null}
              </Link>
            </Tooltip>

            <Link
              href="/settings"
              aria-label="Help and settings"
              className="hidden rounded-md px-2 py-2 text-xs font-medium text-[#64748B] transition-colors hover:bg-brand-100 hover:text-brand-900 sm:inline-flex"
            >
              Help
            </Link>

            <div
              aria-hidden="true"
              className="mx-1 hidden h-6 w-px bg-brand-100 sm:block"
            />

            <div className="flex items-center gap-2">
              <div className="hidden text-right leading-tight sm:block">
                <div className="max-w-[160px] truncate text-xs font-semibold text-brand-900">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[11px] text-[#64748B]">{ROLE_LABELS[user.role]}</div>
              </div>
              <div
                aria-label={`User avatar for ${user.firstName} ${user.lastName}`}
                aria-hidden="false"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-900 text-[11px] font-semibold text-white"
                title={`${user.firstName} ${user.lastName}`}
              >
                {(user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase()}
              </div>
            </div>

            <LogoutButton />
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 outline-none focus-visible:outline-none sm:px-4 md:px-6 lg:px-8"
        >
          {children}
        </main>

        <footer className="border-t border-brand-200/70 px-4 py-4 text-center text-[11px] text-brand-400 sm:px-6 print:hidden">
          {SCHOOL.name} • {SCHOOL.address} • {SCHOOL.region}
        </footer>
      </div>
    </div>
  );
}
