import { redirect } from "next/navigation";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function QrPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-brand-900 tracking-tight">QR Studio</h1>
      <div className="rounded-xl border border-brand-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="h-5 w-5 text-action-700" />
          <h2 className="text-base font-bold text-brand-900">Generate QR Codes</h2>
        </div>
        <p className="text-sm text-brand-500">QR codes can only be generated for verified child records. Each token represents a secure reference for verification.</p>
      </div>
    </div>
  );
}
