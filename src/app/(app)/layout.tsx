import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSystemSetting, isMaintenanceModeOn } from "@/lib/system-settings";
import AppShell from "@/components/app-shell";
import { LogoutButton } from "@/components/logout-button";

/**
 * Authenticated application shell.
 *
 * Also enforces the `maintenance_mode` system setting: when an administrator
 * turns it on, only the administrator tier keeps working — every other signed-in
 * account gets a maintenance notice instead of the module content. The check
 * lives here (not in the client) so a typed URL cannot bypass it.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const maintenance = isMaintenanceModeOn(await getSystemSetting("maintenance_mode"));
  if (maintenance && !user.roles.includes("admin")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
        <div className="w-full max-w-md rounded-[3px] border border-brand-200 bg-white p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[3px] border border-amber-200 bg-status-pending-bg"
          >
            <Wrench className="h-7 w-7 text-status-pending" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-brand-900">Scheduled maintenance</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            The records system is temporarily unavailable while the administrator performs
            maintenance. Your data is safe — please try again later.
          </p>
          <p className="mt-4 text-xs text-brand-400">Signed in as {user.email}</p>
          <div className="mt-6 flex justify-center">
            <LogoutButton />
          </div>
        </div>
      </main>
    );
  }

  return <AppShell user={user}>{children}</AppShell>;
}
