import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { hasPermission } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { updateSystemSettingForm } from "@/actions/settings";
import { updateProfileForm, changePasswordForm } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

const EDITABLE_KEYS = ["system_name", "child_code_prefix", "default_school_year", "maintenance_mode"];

const EDITABLE_LABELS: Record<string, string> = {
  system_name: "System name",
  child_code_prefix: "Child code prefix",
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Settings</h1>

      <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-6 space-y-6">
        <section>
          <h3 className="text-sm font-bold text-brand-900 mb-2">Profile</h3>
          <div className="text-sm text-brand-600">
            Signed in as <span className="text-brand-900 font-medium">{user.email}</span> —{" "}
            {ROLE_LABELS[user.role]}
          </div>
          <form action={updateProfileForm} className="mt-3 flex flex-wrap gap-3 items-end max-w-xl">
            <Field label="First name" htmlFor="firstName" required>
              <Input id="firstName" name="firstName" defaultValue={user.firstName} required maxLength={60} />
            </Field>
            <Field label="Last name" htmlFor="lastName" required>
              <Input id="lastName" name="lastName" defaultValue={user.lastName} required maxLength={60} />
            </Field>
            <Button type="submit" size="md">Save profile</Button>
          </form>
        </section>

        <section className="border-t border-brand-100 pt-5">
          <h3 className="text-sm font-bold text-brand-900 mb-2">Change password</h3>
          <form action={changePasswordForm} className="flex flex-wrap gap-3 items-end max-w-xl">
            <Field label="Current password" htmlFor="currentPassword" required>
              <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="New password" htmlFor="newPassword" required hint="At least 8 characters.">
              <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
            </Field>
            <Button type="submit" size="md">Update password</Button>
          </form>
        </section>

        {canManage ? (
          <section className="border-t border-brand-100 pt-5">
            <h3 className="text-sm font-bold text-brand-900 mb-1">System settings</h3>
            <p className="text-xs text-brand-500 mb-3">
              Configuration only — secrets (passwords, API keys, tokens) live in environment variables, never here.
            </p>
            <div className="space-y-4 max-w-xl">
              {settings.map((s) => (
                <form key={s.key} action={updateSystemSettingForm} className="flex gap-3 items-end">
                  <input type="hidden" name="key" value={s.key} />
                  <Field label={EDITABLE_LABELS[s.key] ?? s.key} htmlFor={`set-${s.key}`}>
                    <Input id={`set-${s.key}`} name="value" defaultValue={s.value} maxLength={200} />
                  </Field>
                  <Button type="submit" variant="outline" size="md">Save</Button>
                </form>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
