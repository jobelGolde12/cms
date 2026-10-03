import { redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { KeyRound, Settings2, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { hasPermission } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { updateSystemSettingForm } from "@/actions/settings";
import { updateProfileForm, changePasswordForm } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        eyebrow="System Configuration"
        title="Settings"
        description="Manage your profile, password, and municipal system configuration."
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Profile"
              icon={<UserRound aria-hidden="true" className="h-4 w-4" />}
            />
            <div className="px-4 py-4">
              <p className="text-sm text-brand-600">
                Signed in as <span className="font-medium text-brand-900">{user.email}</span> —{" "}
                {ROLE_LABELS[user.role]}
              </p>
              <form action={updateProfileForm} className="mt-4 flex flex-wrap items-end gap-3">
                <Field label="First name" htmlFor="firstName" required>
                  <Input id="firstName" name="firstName" defaultValue={user.firstName} required maxLength={60} />
                </Field>
                <Field label="Last name" htmlFor="lastName" required>
                  <Input id="lastName" name="lastName" defaultValue={user.lastName} required maxLength={60} />
                </Field>
                <Button type="submit" size="md">Save profile</Button>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Change password"
              icon={<KeyRound aria-hidden="true" className="h-4 w-4" />}
            />
            <div className="px-4 py-4">
              <form action={changePasswordForm} className="flex flex-wrap items-end gap-3">
                <Field label="Current password" htmlFor="currentPassword" required>
                  <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
                </Field>
                <Field label="New password" htmlFor="newPassword" required hint="At least 8 characters.">
                  <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
                </Field>
                <Button type="submit" size="md">Update password</Button>
              </form>
            </div>
          </Card>
        </div>

        {canManage ? (
          <Card>
            <CardHeader
              title="System settings"
              icon={<Settings2 aria-hidden="true" className="h-4 w-4" />}
            />
            <div className="space-y-5 px-4 py-4">
              <p className="text-xs leading-relaxed text-brand-500">
                Configuration only — secrets (passwords, API keys, tokens) live in environment
                variables, never here.
              </p>
              {settings.map((s) => (
                <form key={s.key} action={updateSystemSettingForm} className="flex items-end gap-3">
                  <input type="hidden" name="key" value={s.key} />
                  <Field label={EDITABLE_LABELS[s.key] ?? s.key} htmlFor={`set-${s.key}`}>
                    <Input id={`set-${s.key}`} name="value" defaultValue={s.value} maxLength={200} />
                  </Field>
                  <Button type="submit" variant="outline" size="md">Save</Button>
                </form>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
