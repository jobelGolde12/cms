import { redirect } from "next/navigation";
import { verifyTokenSchema } from "@/lib/schemas";

export default async function VerifyResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawToken = typeof params.token === "string" ? params.token.trim() : "";
  const validated = verifyTokenSchema.safeParse({ token: rawToken });
  redirect(validated.success ? `/verify/${encodeURIComponent(validated.data.token)}` : "/verify");
}
