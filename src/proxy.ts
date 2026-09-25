import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

/**
 * Optimistic auth gate (cookie presence only). Real session validation and
 * authorization happen server-side in layouts/pages/actions; this only keeps a
 * logged-out visitor out of the app shell as cheaply as possible.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
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
