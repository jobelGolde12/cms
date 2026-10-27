import { describe, it, expect } from "vitest";
import {
  activityTitle,
  activityIcon,
  activityTone,
  formatRelativeTime,
  type ActivityItem,
} from "../dashboard-data";

function makeItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: "log-1",
    action: "CREATE_STUDENT",
    entityType: "student",
    actor: "Juan Dela Cruz",
    createdAt: new Date("2026-10-27T08:00:00Z"),
    ...overrides,
  };
}

describe("activityTitle", () => {
  it("maps known actions to human labels", () => {
    expect(activityTitle(makeItem())).toBe("Student record created — Juan Dela Cruz");
  });

  it("falls back to \"System\" when there is no actor", () => {
    expect(activityTitle(makeItem({ actor: null }))).toBe("Student record created — System");
  });

  it("echoes unknown actions instead of throwing", () => {
    expect(activityTitle(makeItem({ action: "NEW_ACTION" }))).toBe("NEW_ACTION — Juan Dela Cruz");
  });
});

describe("activityIcon", () => {
  it("maps known actions to icon names", () => {
    expect(activityIcon(makeItem({ action: "VERIFY_QR" }))).toBe("qr");
    expect(activityIcon(makeItem({ action: "CREATE_STUDENT" }))).toBe("userPlus");
  });

  it("falls back to the generic activity icon", () => {
    expect(activityIcon(makeItem({ action: "UNKNOWN_THING" }))).toBe("activity");
  });
});

describe("activityTone", () => {
  it("maps create/approve actions to green", () => {
    expect(activityTone(makeItem({ action: "CREATE_STUDENT" }))).toBe("green");
  });

  it("maps reject/duplicate actions to red", () => {
    expect(activityTone(makeItem({ action: "MARK_DUPLICATE" }))).toBe("red");
  });

  it("falls back to gray for unknown actions", () => {
    expect(activityTone(makeItem({ action: "UNKNOWN_THING" }))).toBe("gray");
  });
});

describe("formatRelativeTime", () => {
  it("returns \"just now\" for recent times", () => {
    expect(formatRelativeTime(new Date(Date.now() - 10_000))).toBe("just now");
  });

  it("formats minutes and hours", () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000))).toBe("5m ago");
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3_600_000))).toBe("3h ago");
  });

  it("formats days under a week", () => {
    expect(formatRelativeTime(new Date(Date.now() - 2 * 86_400_000))).toBe("2d ago");
  });

  it("falls back to a short date past one week", () => {
    expect(formatRelativeTime("2026-01-12T00:00:00Z")).toMatch(/[A-Z][a-z]{2} 12/);
  });

  it("returns a dash for invalid input", () => {
    expect(formatRelativeTime("")).toBe("—");
    expect(formatRelativeTime(new Date("garbage"))).toBe("—");
  });
});
