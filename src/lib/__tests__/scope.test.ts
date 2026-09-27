import { describe, it, expect } from "vitest";
import { canAccessChild, canEditChild, type ChildScopeRef } from "../scope";
import type { SessionUser } from "../auth";

/* ---------------------------------------------------------------------------
 * Row-level authorization for the child profile page (the registry's read
 * path) and edit/archive/review actions. These must match the SQL scope in
 * childScope(): barangay users see their barangay + their own records.
 * ------------------------------------------------------------------------- */

const admin: SessionUser = {
  id: "u-admin",
  email: "a@t.gov",
  firstName: "A",
  lastName: "A",
  roleId: "role-admin",
  role: "admin",
  barangayId: null,
};

const lgu: SessionUser = { ...admin, id: "u-lgu", roleId: "role-lgu", role: "lgu" };

const brgyA: SessionUser = {
  id: "u-brgy-a",
  email: "ba@t.gov",
  firstName: "B",
  lastName: "A",
  roleId: "role-barangay",
  role: "barangay",
  barangayId: "brgy-1",
};

const brgyB: SessionUser = { ...brgyA, id: "u-brgy-b", barangayId: "brgy-2" };

const brgyNoAssignment: SessionUser = { ...brgyA, barangayId: null };

const ownRecord: ChildScopeRef = { barangayId: "brgy-1", createdBy: "u-brgy-a" };
const sameBarangayOtherEncoder: ChildScopeRef = { barangayId: "brgy-1", createdBy: "u-someone-else" };
const otherBarangay: ChildScopeRef = { barangayId: "brgy-2", createdBy: "u-someone-else" };
const ownRecordOtherBarangay: ChildScopeRef = { barangayId: "brgy-2", createdBy: "u-brgy-a" };

describe("canAccessChild (read guard)", () => {
  it("grants admin and LGU municipal-wide access", () => {
    expect(canAccessChild(admin, otherBarangay)).toBe(true);
    expect(canAccessChild(lgu, otherBarangay)).toBe(true);
  });

  it("grants barangay users access to own-barangay records", () => {
    expect(canAccessChild(brgyA, ownRecord)).toBe(true);
    expect(canAccessChild(brgyA, sameBarangayOtherEncoder)).toBe(true);
  });

  it("grants barangay users access to records they created in other barangays", () => {
    expect(canAccessChild(brgyA, ownRecordOtherBarangay)).toBe(true);
  });

  it("DENIES barangay users access to other barangays' records", () => {
    expect(canAccessChild(brgyA, otherBarangay)).toBe(false);
    expect(canAccessChild(brgyB, ownRecord)).toBe(false);
  });

  it("unassigned barangay users only see records they created", () => {
    expect(canAccessChild(brgyNoAssignment, ownRecordOtherBarangay)).toBe(true);
    expect(canAccessChild(brgyNoAssignment, sameBarangayOtherEncoder)).toBe(false);
  });
});

describe("canEditChild (edit guard)", () => {
  it("allows editing draft/needs_correction records in scope", () => {
    expect(canEditChild(brgyA, { ...ownRecord, recordStatus: "draft" })).toBe(true);
    expect(canEditChild(brgyA, { ...ownRecord, recordStatus: "needs_correction" })).toBe(true);
  });

  it("locks verified records for non-admins even when in scope", () => {
    expect(canEditChild(brgyA, { ...ownRecord, recordStatus: "verified" })).toBe(false);
    expect(canEditChild(lgu, { ...ownRecord, recordStatus: "verified" })).toBe(false);
  });

  it("admins may edit verified records", () => {
    expect(canEditChild(admin, { ...otherBarangay, recordStatus: "verified" })).toBe(true);
  });

  it("never allows editing records outside scope", () => {
    expect(canEditChild(brgyA, { ...otherBarangay, recordStatus: "draft" })).toBe(false);
  });
});
