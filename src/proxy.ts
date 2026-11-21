import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { getSessionUserByToken } from "@/lib/auth";
import {
  canAccessPath,
  requiredPermissionForPath,
  resolveDashboard,
} from "@/lib/dashboard";
import { trackEvent } from "@/lib/analytics";

/**
 * Optimistic authentication/authorization gate.
 *
 * Session → user → roles is resolved by the SAME helper the server components
 * use (`getSessionUserByToken`), so the proxy cannot consider a session valid
 * that the application would reject (unknown role, unapproved account, …).
 * That mismatch used to bounce authenticated users between /dashboard and
 * /login forever.
 *
 * This gate is defence in depth: layouts, pages and server actions still
 * enforce their own permission checks, so a DB hiccup here can only fall
 * through — never grant access.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Redirect fully-authenticated users away from the sign-in page.
  if (pathname === "/login") {
    if (!raw) return NextResponse.next();

    try {
      const user = await getSessionUserByToken(raw);
      if (user) {
        await trackEvent("page_viewed", {
          route: resolveDashboard(user).path,
          user_role: user.role,
        });
        return NextResponse.redirect(
          new URL(resolveDashboard(user).path, request.url),
        );
      }
    } catch {
      // Database failure: fall through to the auth page.
    }

    // The cookie exists but does not resolve to a usable session (expired,
    // inactive/suspended, or an account without a valid role). Clear it,
    // otherwise /login and /dashboard bounce the user back and forth.
    const response = NextResponse.next();
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // API export routes: JSON errors instead of redirects.
  if (pathname.startsWith("/api/reports")) {
    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const user = await getSessionUserByToken(raw);
      if (!user) {
        const response = NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
      }
      if (!canAccessPath(user, pathname)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      // DB failure: fall through (handler-level auth remains the backstop).
    }
    return NextResponse.next();
  }

  // Protected routes: no session cookie → login.
  if (!raw) return redirectToLogin(request);

  try {
    const user = await getSessionUserByToken(raw);

    if (!user) {
      // Stale/revoked/expired session, deactivated account or unknown role.
      return redirectToLogin(request);
    }

    // Role/permission gate for the requested module. Unauthorized URLs are
    // redirected to the account's own dashboard with a safe denial message —
    // the module itself is never rendered.
    if (!canAccessPath(user, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = resolveDashboard(user).path;
      const denied = requiredPermissionForPath(pathname);
      url.search = denied ? `?denied=${encodeURIComponent(denied)}` : "";
      await trackEvent("login_failed", {
        result: "unauthorized-access-attempt",
      });
      return NextResponse.redirect(url);
    }
  } catch {
    // DB failure: fall through (real validation happens server-side in
    // layouts/pages/actions).
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const response = NextResponse.redirect(url);
  // Drop the unusable cookie so the login page is not immediately redirected
  // back to /dashboard.
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
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
    "/assignments/:path*",
    "/qr/:path*",
    "/activity-logs/:path*",
    "/users/:path*",
    "/notifications/:path*",
    "/settings/:path*",
  ],
};
