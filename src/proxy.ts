import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { hashToken } from "@/lib/auth";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

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
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      } catch {
        // DB failure or invalid session: fall through to auth page.
      }
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
