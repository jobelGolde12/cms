import { logAudit } from "./audit";
import { getCurrentUser } from "./auth";

export type AnalyticsEvent =
  | "page_viewed"
  | "login_completed"
  | "login_failed"
  | "logout_completed"
  | "child_created"
  | "child_updated"
  | "child_deleted"
  | "child_archived"
  | "validation_submitted"
  | "validation_approved"
  | "validation_needs_correction"
  | "duplicate_review_started"
  | "duplicate_review_completed"
  | "intervention_started"
  | "intervention_completed"
  | "monitoring_recorded"
  | "notification_read"
  | "notification_deleted"
  | "report_generated"
  | "export_completed"
  | "qr_generated"
  | "qr_verified"
  | "qr_revoked"
  | "settings_updated"
  | "user_role_changed"
  | "error_occurred"
  | "feature_used";

export interface EventProperties {
  route?: string;
  user_role?: string;
  feature?: string;
  status?: string;
  result?: string;
  error_category?: string;
  duration_ms?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Track an analytics event server-side.
 * Only non-sensitive properties allowed; no PII, no tokens.
 */
export async function trackEvent(
  event: AnalyticsEvent,
  properties: EventProperties = {},
): Promise<void> {
  try {
    const user = await getCurrentUser();
    const safeProperties: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(properties)) {
      if (v !== undefined && typeof v !== "object") {
        safeProperties[k] = v;
      }
    }
    // Write to audit log with minimal context for observability.
    await logAudit({
      userId: user?.id ?? null,
      action: `analytics.${String(event)}`,
      entityType: "analytics",
      entityId: String(event),
      oldValues: null,
      newValues: safeProperties,
      ipAddress: null,
      userAgent: null,
    });
  } catch {
    // Analytics must never break the main operation.
  }
}
