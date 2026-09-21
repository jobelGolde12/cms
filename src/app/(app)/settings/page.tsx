import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">Settings</h1>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-6 space-y-6">
        <section>
          <h3 className="text-sm font-bold text-brand-900 mb-2">Profile</h3>
          <div className="text-sm text-brand-600">Name: <span className="text-brand-900 font-medium">{user.firstName} {user.lastName}</span></div>
          <div className="text-sm text-brand-600">Email: <span className="text-brand-900 font-medium">{user.email}</span></div>
        </section>
        <section>
          <h3 className="text-sm font-bold text-brand-900 mb-2">Password</h3>
          <p className="text-xs text-brand-500">Use the change password action when available.</p>
        </section>
      </div>
    </div>
  );
}
