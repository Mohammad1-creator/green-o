import { describe, expect, it } from "vitest";

import { deductsPoints, violationCode } from "@/features/safety/labels";
import {
  canRecordViolations,
  homePathFor,
  isManagerRole,
  SAFETY_ROLES,
} from "@/lib/auth/roles";

describe("safety roles", () => {
  it("lets the safety manager, supervisors and top roles record violations", () => {
    expect(canRecordViolations("hse_manager")).toBe(true);
    expect(canRecordViolations("hse_supervisor")).toBe(true);
    expect(canRecordViolations("general_manager")).toBe(true);
    expect(canRecordViolations("developer")).toBe(true);
    expect(canRecordViolations("production_manager")).toBe(false);
    expect(canRecordViolations("employee")).toBe(false);
  });

  it("keeps decisions with the safety manager and top roles", () => {
    expect(SAFETY_ROLES).toEqual([
      "developer",
      "general_manager",
      "hse_manager",
    ]);
  });

  it("sends the safety manager to the admin panel and supervisors to the phone", () => {
    expect(isManagerRole("hse_manager")).toBe(true);
    expect(homePathFor("hse_manager")).toBe("/admin");
    expect(homePathFor("hse_supervisor")).toBe("/m");
  });
});

describe("violation labels", () => {
  it("formats the violation number", () => {
    expect(violationCode(42)).toBe("V-000042");
  });

  it("deducts points unless the violation is cancelled", () => {
    expect(deductsPoints("pending")).toBe(true);
    expect(deductsPoints("confirmed")).toBe(true);
    expect(deductsPoints("cancelled")).toBe(false);
  });
});
