import {
  LayoutDashboard,
  ClipboardCheck,
  ShieldCheck,
  ScanSearch,
  BarChart3,
  FileText,
  QrCode,
  Users,
  Activity,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Nav icons are referenced by NAME (a plain string) so they can safely cross
 * the server→client component boundary. Component references (forwardRef
 * functions) cannot be passed as props from Server Components to Client
 * Components — the string key is resolved to the icon on the client side.
 */
export const NAV_ICONS = {
  dashboard: LayoutDashboard,
  children: ClipboardCheck,
  validation: ShieldCheck,
  duplicates: ScanSearch,
  monitoring: BarChart3,
  reports: FileText,
  qr: QrCode,
  users: Users,
  activity: Activity,
  notifications: Bell,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof NAV_ICONS;

/** Resolve an icon name to its component (falls back to the dashboard icon). */
export function navIcon(name: string): LucideIcon {
  return NAV_ICONS[name as NavIconName] ?? LayoutDashboard;
}
