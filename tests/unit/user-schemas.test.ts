import { describe, expect, it } from "vitest";

import { createUserSchema, updateUserSchema } from "@/features/users/schemas";

const DEPARTMENT = "3f1c3b8e-6f2a-4b8e-9c1d-2a7b5e9f0c11";

describe("createUserSchema", () => {
  it("normalizes the input", () => {
    const result = createUserSchema.parse({
      fullName: "  أحمد علي  ",
      employeeNo: "٢٠٠٥",
      password: "Factory-2026",
      role: "employee",
      departmentId: DEPARTMENT,
      phone: "٠٧٧٠ ١٢٣ ٤٥٦٧",
      jobTitle: "",
    });
    expect(result).toEqual({
      fullName: "أحمد علي",
      employeeNo: "2005",
      password: "Factory-2026",
      role: "employee",
      departmentId: DEPARTMENT,
      phone: "0770 123 4567",
      jobTitle: null,
    });
  });

  it("reports field errors in Arabic", () => {
    const result = createUserSchema.safeParse({
      fullName: "أ",
      employeeNo: "12ab",
      password: "12345678",
      role: "boss",
      departmentId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    const fields = new Set(result.error?.issues.map((issue) => issue.path[0]));
    expect(fields).toEqual(
      new Set(["fullName", "employeeNo", "role", "departmentId"]),
    );
  });

  it("checks the password once the other fields are valid", () => {
    const result = createUserSchema.safeParse({
      fullName: "أحمد علي",
      employeeNo: "2005",
      password: "12345678",
      role: "employee",
      departmentId: DEPARTMENT,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });

  it("allows no department (the general manager has none)", () => {
    const result = createUserSchema.safeParse({
      fullName: "مدير عام",
      employeeNo: "1",
      password: "Factory-2026",
      role: "general_manager",
      departmentId: "",
    });
    expect(result.success).toBe(true);
    expect(result.data?.departmentId).toBeNull();
  });
});

describe("updateUserSchema", () => {
  it("requires a valid user id", () => {
    const result = updateUserSchema.safeParse({
      userId: "x",
      fullName: "أحمد علي",
      employeeNo: "2005",
      role: "employee",
      departmentId: DEPARTMENT,
    });
    expect(result.success).toBe(false);
  });
});
