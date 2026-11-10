import { describe, expect, it } from "vitest";

import { passwordProblem } from "@/lib/auth/password-policy";
import { homePathFor, safeNextPath } from "@/lib/auth/roles";
import {
  STAFF_EMAIL_DOMAIN,
  employeeNumberToEmail,
  isValidEmployeeNumber,
  normalizeEmployeeNumber,
} from "@/lib/auth/staff-email";
import { suggestPassword } from "@/lib/auth/suggest-password";
import { toWesternDigits } from "@/lib/digits";

describe("toWesternDigits", () => {
  it("converts Arabic-Indic and Persian digits", () => {
    expect(toWesternDigits("١٢٣٤٥٦٧٨٩٠")).toBe("1234567890");
    expect(toWesternDigits("۱۲۳")).toBe("123");
    expect(toWesternDigits("رقم 12٣")).toBe("رقم 123");
  });
});

describe("employee numbers", () => {
  it("normalizes spaces and Arabic-Indic digits", () => {
    expect(normalizeEmployeeNumber(" ١٠ ٠٠ ")).toBe("1000");
  });

  it("accepts 1 to 10 digits only", () => {
    expect(isValidEmployeeNumber("1000")).toBe(true);
    expect(isValidEmployeeNumber("١٠٠٠")).toBe(true);
    expect(isValidEmployeeNumber("")).toBe(false);
    expect(isValidEmployeeNumber("12345678901")).toBe(false);
    expect(isValidEmployeeNumber("12a4")).toBe(false);
  });

  it("maps to an address under the reserved, undeliverable domain", () => {
    expect(STAFF_EMAIL_DOMAIN.endsWith(".invalid")).toBe(true);
    expect(employeeNumberToEmail("٢٠٠١")).toBe(`2001@${STAFF_EMAIL_DOMAIN}`);
    expect(() => employeeNumberToEmail("abc")).toThrow(RangeError);
  });
});

describe("passwordProblem", () => {
  it("accepts a reasonable password", () => {
    expect(passwordProblem("Factory-2026", "1000")).toBeNull();
  });

  it.each([
    ["short1", "قصيرة"],
    ["aaaaaaaa", "مكرر"],
    ["12345678", "متتالية"],
    ["87654321", "متتالية"],
    ["abcdefgh", "متتالية"],
    ["Password", "شائعة"],
  ])("rejects %s", (password) => {
    expect(passwordProblem(password)).not.toBeNull();
  });

  it("rejects the employee number as the password", () => {
    expect(passwordProblem("20012001", "20012001")).not.toBeNull();
  });

  it("rejects passwords longer than bcrypt reads", () => {
    expect(passwordProblem("ب".repeat(40))).not.toBeNull();
  });

  it("suggested passwords always pass", () => {
    for (let i = 0; i < 50; i++) {
      const password = suggestPassword();
      expect(password).toHaveLength(10);
      expect(passwordProblem(password)).toBeNull();
    }
  });
});

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/admin/users")).toBe("/admin/users");
    expect(safeNextPath("/m?tab=tasks")).toBe("/m?tab=tasks");
  });

  it.each([
    null,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/login",
    "/auth/signout",
  ])("rejects %s", (value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});

describe("homePathFor", () => {
  it("sends managers to the admin panel and employees to the mobile app", () => {
    expect(homePathFor("general_manager")).toBe("/admin");
    expect(homePathFor("production_manager")).toBe("/admin");
    expect(homePathFor("employee")).toBe("/m");
  });
});
