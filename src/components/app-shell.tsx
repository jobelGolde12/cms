import Link from "next/link";
import { UsersRound, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { MobileNavToggle } from "./mobile-nav-toggle";
import { NavItemClient } from "./nav-item-client";

type NavLink = {
  label: string;
  href: string;
  icon: string; // icon NAME — resolved to a component on the client (see nav-icons.tsx)
  permission: Permission;
};

const navLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", permission: "children.view" },
  { label: "Child Registry", href: "/children", icon: "children", permission: "children.view" },
  { label: "Validation", href: "/validation", icon: "validation", permission: "validation.view" },
  { label: "Duplicate Review", href: "/duplicates", icon: "duplicates", permission: "duplicates.view" },
  { label: "Monitoring", href: "/monitoring", icon: "monitoring", permission: "monitoring.view" },
  { label: "Reports", href: "/reports", icon: "reports", permission: "reports.view" },
  { label: "QR Studio", href: "/qr", icon: "qr", permission: "qr.verify" },
  { label: "Users", href: "/users", icon: "users", permission: "users.view" },
  { label: "Activity Logs", href: "/activity-logs", icon: "activity", permission: "audit_logs.view" },
  { label: "Notifications", href: "/notifications", icon: "notifications", permission: "children.view" },
  { label: "Settings", href: "/settings", icon: "settings", permission: "children.view" },
];

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return <div className="min-h-screen bg-brand-50" />;

  const visibleLinks = navLinks.filter((link) => hasPermission(user.role, link.permission));

  return (
    <div className="min-h-screen bg-brand-50 flex">
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-40 bg-brand-900 text-white border-r border-brand-800 shadow-xl">
        <div className="h-16 flex items-center px-6 border-b border-brand-800 gap-3">
          <div className="h-9 w-9 rounded-lg bg-action-600 flex items-center justify-center shadow-md">
            <UsersRound className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-semibold tracking-wide text-brand-300">STA. MAGDALENA</div>
            <div className="text-sm font-bold text-white tracking-tight">Child Mapping</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {visibleLinks.map((link) => (
            <NavItemClient key={link.href} link={link} />
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-brand-800 text-xs text-brand-400">
          <div className="font-medium text-brand-200">{user.firstName} {user.lastName}</div>
          <div className="mt-0.5">{ROLE_LABELS[user.role]}</div>
        </div>
      </aside>
      <div className="lg:pl-64 flex-1 min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur border-b border-brand-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNavToggle links={visibleLinks} />
            <h2 className="text-base font-bold text-brand-900 truncate min-w-0">Child Mapping System</h2>
          </div>
          <div className="flex items-center gap-3 text-sm text-brand-600">
            <span className="hidden sm:inline">{user.email}</span>
            <Link href="/logout" className="text-brand-500 hover:text-brand-800 flex items-center gap-1.5 text-xs font-medium">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
