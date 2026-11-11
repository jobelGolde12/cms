import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MfaSettings } from "@/components/settings/mfa-settings";
import { buttonStyles } from "@/components/ui/button";

export const metadata = { title: "Two-factor authentication · Records Management System" };

export default async function MfaSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({ mfaEnabled: users.mfaEnabled, mfaEnrolledAt: users.mfaEnrolledAt })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const enabled = Boolean(rows[0]?.mfaEnabled);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Account Security"
        title="Two-factor authentication"
        description="Protect your account with an authenticator app. After your password, a short-lived 6-digit code is required — recovery codes let you sign in if the app is unavailable."
      />

      <Card>
        <CardHeader
          title="Authenticator app (TOTP)"
          description={
            enabled
              ? "Two-factor authentication is enabled for this account."
              : "Add a second step to sign-in. The secret is stored encrypted and never sent to the browser after setup."
          }
          icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
        />
        <CardBody>
          <MfaSettings enabled={enabled} enrolledAt={rows[0]?.mfaEnrolledAt ?? null} />
        </CardBody>
      </Card>

      <div>
        <Link href="/settings" className={buttonStyles("outline", "md")}>
          Back to settings
        </Link>
      </div>
    </div>
  );
}
