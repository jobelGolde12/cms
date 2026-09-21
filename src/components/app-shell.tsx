import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  ShieldCheck,
  Activity,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  BarChart3,
  ClipboardCheck,
  UsersRound,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Child Registry", href: "/children", icon: ClipboardCheck },
  { label: "Validation", href: "/validation", icon: ShieldCheck },
  { label: "Monitoring", href: "/monitoring", icon: BarChart3 },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "QR Studio", href: "/qr", icon: ShieldCheck },
  { label: "Users", href: "/users", icon: Users },
  { label: "Activity Logs", href: "/activity-logs", icon: Activity },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return <div className="min-h-screen bg-brand-50" />;

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
          {navLinks.map((link) => (
            <NavItem key={link.href} link={link} />
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-brand-800 text-xs text-brand-400">
          <div className="font-medium text-brand-200">{user.firstName} {user.lastName}</div>
          <div className="mt-0.5">{user.role}</div>
        </div>
      </aside>
      <div className="lg:pl-64 flex-1 min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur border-b border-brand-200 px-6 flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-900">Child Mapping System</h2>
          <div className="flex items-center gap-3 text-sm text-brand-600">
            <span className="hidden sm:inline">{user.email}</span>
            <a href="/login?action=logout" className="text-brand-500 hover:text-brand-800 flex items-center gap-1.5 text-xs font-medium">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </a>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ link }: { link: typeof navLinks[0] }) {
  const pathname = usePathname();
  const active = pathname === link.href || pathname.startsWith(link.href + "/");
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-800 text-white shadow-sm"
          : "text-brand-300 hover:text-white hover:bg-brand-800/60"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{link.label}</span>
    </Link>
  );
}
