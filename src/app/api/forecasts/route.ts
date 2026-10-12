import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getForecastWithCache, parseScopeParam, VIEW_PERMISSION } from "@/lib/forecasting/service";
import { logAudit } from "@/lib/audit";
import { sessionMetadata } from "@/actions/helpers";

/**
 * Unified forecast API (plan §34.1):
 *   GET /api/forecasts?type=school_wide
 *   GET /api/forecasts?type=grade_level&scope=<gradeLevelId>
 *   GET /api/forecasts?type=subject&scope=<subjectId>
 *
 * Authorization: any signed-in user with grades.view (plan §27.1). Scope
 * filtering (teacher → adviser sections only) is enforced in UI data wiring;
 * this endpoint returns aggregate-only data (no student PII, plan §29.2).
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(user.role, VIEW_PERMISSION)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = parseScopeParam(
    url.searchParams.get("type") ?? undefined,
    url.searchParams.get("scope") ?? undefined,
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await getForecastWithCache(parsed.params, user.id);
    const { ip, userAgent } = await sessionMetadata();
    await logAudit({
      userId: user.id,
      action: "VIEW_FORECAST",
      entityType: "forecast",
      entityId: `${parsed.params.type}:${parsed.params.scopeLevel}`,
      ipAddress: ip,
      userAgent,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[forecasts:api] generation failed", error);
    const message = error instanceof Error ? error.message : "Forecast generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
