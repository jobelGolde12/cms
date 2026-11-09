import { describe, expect, it } from "vitest";
import {
  RETIRED_DEMO_EMPLOYEE_NUMBERS,
  assertNotRetiredDemoIdentifier,
  isRetiredDemoEmail,
  isRetiredDemoEmployeeNumber,
  isRetiredDemoIdentifier,
  isRetiredDemoSectionId,
  isRetiredDemoUserId,
} from "@/lib/retired-demo";

/**
 * The demo data purged from the Turso `cms` database on 2026-11-08 must never
 * be recreated. These guards are the second line of defence behind the
 * rewritten seed scripts.
 */
describe("retired demo identifiers", () => {
  it("rejects the retired demo e-mail addresses", () => {
    expect(isRetiredDemoEmail("admin@gmail.com")).toBe(true);
    expect(isRetiredDemoEmail("teacher@local.dev")).toBe(true);
    expect(isRetiredDemoEmail("anything@local.dev")).toBe(true);
    expect(isRetiredDemoEmail("qa-integration@qa.local.dev")).toBe(true);
  });

  it("keeps real school accounts out of the retired set", () => {
    expect(isRetiredDemoEmail("meisher.alcaraz@deped.gov.ph")).toBe(false);
    expect(isRetiredDemoEmail("school.admin@deped.gov.ph")).toBe(false);
  });

  it("rejects the seeded employee numbers but keeps the surviving one", () => {
    expect(isRetiredDemoEmployeeNumber("EMP-2026-000001")).toBe(true);
    expect(isRetiredDemoEmployeeNumber("EMP-2026-000010")).toBe(true);
    expect(RETIRED_DEMO_EMPLOYEE_NUMBERS.has("EMP-2026-000011")).toBe(false);
    expect(isRetiredDemoEmployeeNumber("EMP-2026-000011")).toBe(false);
  });

  it("rejects the seeded section ids", () => {
    expect(isRetiredDemoSectionId("sec-7-0")).toBe(true);
    expect(isRetiredDemoSectionId("sec-10-11")).toBe(true);
    expect(isRetiredDemoSectionId("sec-12-hestia")).toBe(false);
  });

  it("rejects the seeded account ids but never the real administrator", () => {
    expect(isRetiredDemoUserId("user-teacher")).toBe(true);
    expect(isRetiredDemoUserId("user-subject")).toBe(true);
    expect(isRetiredDemoUserId("user-admin")).toBe(false);
  });

  it("guards the identifier union", () => {
    expect(isRetiredDemoIdentifier("user-teacher")).toBe(true);
    expect(isRetiredDemoIdentifier("sec-8-4")).toBe(true);
    expect(isRetiredDemoIdentifier("EMP-2026-000003")).toBe(true);
    expect(isRetiredDemoIdentifier("user-admin")).toBe(false);
    expect(isRetiredDemoIdentifier("sec-12-hestia")).toBe(false);
  });

  it("throws when a seed tries to recreate a retired identifier", () => {
    expect(() => assertNotRetiredDemoIdentifier("user-teacher")).toThrow(
      /must not be recreated/,
    );
    expect(() => assertNotRetiredDemoIdentifier("user-admin")).not.toThrow();
  });
});
