import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { hasPermission } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { updateSystemSettingForm } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsShell } from "@/components/settings/settings-shell";

const EDITABLE_KEYS = ["system_name", "student_number_prefix", "default_school_year", "maintenance_mode"];

const EDITABLE_LABELS: Record<string, string> = {
  system_name: "System name",
  student_number_prefix: "Student number prefix",
  default_school_year: "Default school year",
  maintenance_mode: "Maintenance mode (true/false)",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const settings = await db
    .select()
    .from(systemSettings)
    .where(inArray(systemSettings.key, EDITABLE_KEYS));

  const canManage = hasPermission(user.role, "settings.manage");

  // Server-rendered system-configuration section, shown for `settings.manage`
  // roles only — the shell mounts it as the "System" nav entry.
  const systemSection = canManage ? (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-brand-100 px-6 py-5">
        <h2 className="text-base font-semibold text-brand-900">System Preferences</h2>
        <p className="mt-0.5 text-sm text-[#64748B]">
          Configuration only — secrets (passwords, API keys, tokens) live in environment
          variables, never here.
        </p>
      </header>
      <div className="flex-1 space-y-4 px-6 py-6 sm:max-w-md">
        {settings.map((s) => (
          <form key={s.key} action={updateSystemSettingForm} className="flex items-end gap-3">
            <input type="hidden" name="key" value={s.key} />
            <div className="flex-1">
              <Field label={EDITABLE_LABELS[s.key] ?? s.key} htmlFor={`set-${s.key}`}>
                <Input id={`set-${s.key}`} name="value" defaultValue={s.value} maxLength={200} />
              </Field>
            </div>
            <Button type="submit" variant="outline" size="md">
              Save
            </Button>
          </form>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System Configuration"
        title="Settings"
        description="Manage your profile, password, and school configuration."
      />

      <SettingsShell
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
        roleLabel={ROLE_LABELS[user.role]}
        systemSection={systemSection}
      />
    </div>
  );
}
