import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { hashToken, roleNameFromId } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { trackEvent } from "@/lib/analytics";

/**
 * Optimistic auth gate (cookie presence + DB session validation where needed).
 * Keeps unauthenticated visitors out of protected routes and redirects
 * already-authenticated users away from login/register.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from auth pages.
  if (pathname === "/login" || pathname === "/register") {
    const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (raw) {
      try {
        const tokenHash = hashToken(raw);
        const rows = await db
          .select({
            isActive: users.isActive,
          })
          .from(sessions)
          .innerJoin(users, eq(users.id, sessions.userId))
          .where(
            and(
              eq(sessions.tokenHash, tokenHash),
              gt(sessions.expiresAt, new Date()),
            ),
          )
          .limit(1);
        if (rows[0] && rows[0].isActive) {
          await trackEvent("page_viewed", { route: "/dashboard", user_role: "authenticated" });
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      } catch {
        // DB failure or invalid session: fall through to auth page.
      }
    }
    return NextResponse.next();
  }

  // API export routes: reject with JSON 401/403 instead of redirecting.
  // Handler-level getCurrentUser() + hasPermission() checks remain in place
  // as defense-in-depth (see src/app/api/reports/[type]/route.ts).
  if (pathname.startsWith("/api/reports")) {
    const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const tokenHash = hashToken(raw);
      const rows = await db
        .select({ roleId: users.roleId })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(
          and(
            eq(sessions.tokenHash, tokenHash),
            gt(sessions.expiresAt, new Date()),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Pre-check `reports.export` so unauthorized roles are rejected before
      // the (potentially heavy) export handler runs. On DB failure, fall
      // through and let the handler-level checks decide.
      const role = roleNameFromId(row.roleId);
      if (role && !hasPermission(role, "reports.export")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      // DB failure: fall through (handler-level auth remains the backstop).
    }
    return NextResponse.next();
  }

  // Protected routes: redirect unauthenticated users to login.
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Best-effort session validation for protected routes (cookie present but may be expired).
  try {
    const raw = request.cookies.get(SESSION_COOKIE_NAME)!.value;
    const tokenHash = hashToken(raw);
    const rows = await db
      .select({ id: users.id })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!rows[0]) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
    await trackEvent("login_failed", { result: "unauthorized-access-attempt" });
    return NextResponse.redirect(url);
    }
  } catch {
    // DB failure: fall through (real validation happens server-side in layouts/pages).
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/api/reports/:path*",
    "/dashboard/:path*",
    "/children/:path*",
    "/validation/:path*",
    "/duplicates/:path*",
    "/monitoring/:path*",
    "/reports/:path*",
    "/qr/:path*",
    "/activity-logs/:path*",
    "/users/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
