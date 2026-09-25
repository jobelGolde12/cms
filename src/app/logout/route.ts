import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { createHash } from "node:crypto";

/**
 * GET /logout — destroys the current session server-side and clears the
 * cookie. The app shell links here; the login page redirects authenticated
 * users away, so this route only ever runs for signed-in users.
 */
export async function GET(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    try {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    } catch (error) {
      console.error("[logout] failed to delete session", error);
    }
  }

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
