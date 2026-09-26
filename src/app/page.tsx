import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import WelcomePage from "@/components/welcome/WelcomePage";

/**
 * Must render per request: the signed-in check reads cookies. Without this,
 * the route is prerendered once at build time and signed-in users see the
 * public landing page instead of being redirected to their dashboard.
 */
export const dynamic = "force-dynamic";

/**
 * Public entry point.
 *
 * - Signed-in users go straight to their dashboard.
 * - Everyone else sees the Welcome / Landing page.
 * - If the database is unreachable, fall back to the public landing page
 *   rather than crashing into the error boundary.
 */
export default async function HomePage() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("[root page] getCurrentUser failed", error);
    user = null;
  }

  if (user) redirect("/dashboard");
  return <WelcomePage />;
}
