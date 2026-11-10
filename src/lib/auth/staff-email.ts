import { STAFF_EMAIL_DOMAIN } from "@/lib/auth/staff-email-domain";
import { toWesternDigits } from "@/lib/digits";

export { STAFF_EMAIL_DOMAIN };

export const EMPLOYEE_NO_PATTERN = /^[0-9]{1,10}$/;

/** Trims spaces and converts Arabic-Indic digits to Western digits. */
export function normalizeEmployeeNumber(value: string): string {
  return toWesternDigits(value).replace(/\s+/g, "");
}

export function isValidEmployeeNumber(value: string): boolean {
  return EMPLOYEE_NO_PATTERN.test(normalizeEmployeeNumber(value));
}

/** The login address for an employee number (see STAFF_EMAIL_DOMAIN). */
export function employeeNumberToEmail(value: string): string {
  const employeeNo = normalizeEmployeeNumber(value);
  if (!EMPLOYEE_NO_PATTERN.test(employeeNo)) {
    throw new RangeError("Employee number must be 1 to 10 digits.");
  }
  return `${employeeNo}@${STAFF_EMAIL_DOMAIN}`;
}
