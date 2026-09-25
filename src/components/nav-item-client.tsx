"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavItemClient({
  link,
}: {
  link: { label: string; href: string; icon: React.ComponentType<{ className?: string }> };
}) {
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
