import { describe, it, expect } from "vitest";
import {
  REVIEW_DECISION_TO_RECORD_STATUS,
  canTransition,
  isEditable,
  isAwaitingValidation,
  validationStatusFor,
} from "../workflow";
import { RECORD_STATUSES, type RecordStatus } from "../constants";

describe("REVIEW_DECISION_TO_RECORD_STATUS", () => {
  it("maps every reviewer decision to a LEGAL record_status", () => {
    const legal = new Set<string>(RECORD_STATUSES);
    for (const [, target] of Object.entries(REVIEW_DECISION_TO_RECORD_STATUS)) {
      expect(legal.has(target), `${target} must be a legal RecordStatus`).toBe(true);
    }
  });

  it("maps approved → verified", () => {
    expect(REVIEW_DECISION_TO_RECORD_STATUS.approved).toBe("verified");
  });

  it("maps needs_correction → needs_correction", () => {
    expect(REVIEW_DECISION_TO_RECORD_STATUS.needs_correction).toBe("needs_correction");
  });

  it("maps rejected → marked_duplicate (never the illegal 'rejected' record status)", () => {
    expect(REVIEW_DECISION_TO_RECORD_STATUS.rejected).toBe("marked_duplicate");
    expect(RECORD_STATUSES).not.toContain("rejected");
  });
});

describe("canTransition (workflow guard)", () => {
  it("allows pending_validation → verified | needs_correction | marked_duplicate", () => {
    expect(canTransition("pending_validation", "verified")).toBe(true);
    expect(canTransition("pending_validation", "needs_correction")).toBe(true);
    expect(canTransition("pending_validation", "marked_duplicate")).toBe(true);
  });

  it("rejects pending_validation → rejected (not a legal status)", () => {
    expect(
      canTransition("pending_validation", "rejected" as unknown as RecordStatus),
    ).toBe(false);
  });

  it("allows verified → pending_validation only for admins", () => {
    expect(canTransition("verified", "pending_validation")).toBe(false);
    expect(canTransition("verified", "pending_validation", "admin")).toBe(true);
  });
});

describe("record helpers", () => {
  it("isEditable: only draft and needs_correction", () => {
    expect(isEditable("draft")).toBe(true);
    expect(isEditable("needs_correction")).toBe(true);
    expect(isEditable("pending_validation")).toBe(false);
    expect(isEditable("verified")).toBe(false);
    expect(isEditable("marked_duplicate")).toBe(false);
  });

  it("isAwaitingValidation: only pending_validation", () => {
    expect(isAwaitingValidation("pending_validation")).toBe(true);
    expect(isAwaitingValidation("draft")).toBe(false);
  });

  it("validationStatusFor maps record → validation history status", () => {
    expect(validationStatusFor("verified")).toBe("approved");
    expect(validationStatusFor("marked_duplicate")).toBe("rejected");
    expect(validationStatusFor("pending_validation")).toBe("pending");
  });
});
