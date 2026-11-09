import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, type Role } from "@/lib/constants";
import { hashToken, roleNameFromId } from "@/lib/auth";
import { hasUserPermission } from "@/lib/permissions";
import { db } from "@/db";
import { sessions, userRoles, users } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { trackEvent } from "@/lib/analytics";

/**
 * Every role an account holds — the primary role first, then the additional
 * roles from `user_roles`. Mirrors `getCurrentUser()` in src/lib/auth.ts so
 * the optimistic gate and the handler-level checks agree.
 */
async function userRoleKeys(userId: string, primaryRoleId: string): Promise<Role[]> {
  const roles: Role[] = [];
  const primary = roleNameFromId(primaryRoleId);
  if (primary) roles.push(primary);
  const extra = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  for (const r of extra) {
    const key = roleNameFromId(r.roleId);
    if (key && !roles.includes(key)) roles.push(key);
  }
  return roles;
}

/**
 * Optimistic auth gate (cookie presence + DB session validation where needed).
 * Keeps unauthenticated visitors out of protected routes and redirects
 * already-authenticated users away from login/register.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from auth pages.
  if (pathname === "/login") {
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
  // Handler-level getCurrentUser() + hasUserPermission() checks remain in
  // place as defense-in-depth (see src/app/api/reports/[type]/route.ts).
  if (pathname.startsWith("/api/reports")) {
    const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const tokenHash = hashToken(raw);
      const rows = await db
        .select({ userId: users.id, roleId: users.roleId })
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
      // the (potentially heavy) export handler runs. The check resolves over
      // the UNION of every role the account holds (an account may be both an
      // Adviser and a Subject Teacher). On DB failure, fall through and let
      // the handler-level checks decide.
      const roles = await userRoleKeys(row.userId, row.roleId);
      if (roles.length > 0 && !hasUserPermission(roles, "reports.export")) {
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
    "/api/reports/:path*",
    "/dashboard/:path*",
    "/students/:path*",
    "/health/:path*",
    "/verification/:path*",
    "/duplicates/:path*",
    "/performance/:path*",
    "/development/:path*",
    "/reports/:path*",
    "/grades/:path*",
    "/guidance/:path*",
    "/employees/:path*",
    "/service-credits/:path*",
    "/sections/:path*",
    "/qr/:path*",
    "/activity-logs/:path*",
    "/users/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
