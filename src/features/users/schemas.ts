import { z } from "zod";

import { passwordProblem } from "@/lib/auth/password-policy";
import { APP_ROLES } from "@/lib/auth/roles";
import {
  EMPLOYEE_NO_PATTERN,
  normalizeEmployeeNumber,
} from "@/lib/auth/staff-email";
import { toWesternDigits } from "@/lib/digits";

const text = z
  .string()
  .optional()
  .transform((value) => (value ?? "").trim());

const fullName = text.pipe(
  z.string().min(2, "الاسم قصير جداً").max(100, "الاسم طويل جداً"),
);

const employeeNo = text
  .transform(normalizeEmployeeNumber)
  .pipe(
    z.string().regex(EMPLOYEE_NO_PATTERN, "رقم الموظف أرقام فقط، حتى 10 أرقام"),
  );

const role = z.enum(APP_ROLES, "اختر الدور");

const departmentId = text
  .transform((value) => value || null)
  .pipe(z.uuid("اختر القسم").nullable());

const phone = text
  .transform(toWesternDigits)
  .pipe(z.string().regex(/^(\+?[0-9 ]{6,20})?$/, "رقم الهاتف غير صالح"))
  .transform((value) => value || null);

const jobTitle = text
  .pipe(z.string().max(100, "المسمى الوظيفي طويل جداً"))
  .transform((value) => value || null);

const notes = text
  .pipe(z.string().max(1000, "الملاحظات طويلة جداً"))
  .transform((value) => value || null);

const userId = z.uuid("مستخدم غير صالح");

function checkPassword(
  value: { password: string; employeeNo: string },
  ctx: z.RefinementCtx,
) {
  const problem = passwordProblem(value.password, value.employeeNo);
  if (problem)
    ctx.addIssue({ code: "custom", path: ["password"], message: problem });
}

export const createUserSchema = z
  .object({
    fullName,
    employeeNo,
    password: z.string().default(""),
    role,
    departmentId,
    phone,
    jobTitle,
  })
  .superRefine(checkPassword);

export const updateUserSchema = z.object({
  userId,
  fullName,
  employeeNo,
  role,
  departmentId,
  phone,
  jobTitle,
  notes,
});

export const setUserActiveSchema = z.object({
  userId,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const resetPasswordSchema = z
  .object({
    userId,
    employeeNo,
    password: z.string().default(""),
  })
  .superRefine(checkPassword);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
