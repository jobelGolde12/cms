import { redirect } from "next/navigation";

export default async function VerifyResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";
  redirect(token ? `/verify/${encodeURIComponent(token)}` : "/verify");
}
