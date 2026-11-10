export const PASSWORD_MIN_LENGTH = 8;
// bcrypt (used by Supabase Auth) ignores anything past 72 bytes.
export const PASSWORD_MAX_LENGTH = 72;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "passw0rd",
  "qwertyui",
  "qwerty123",
  "asdfghjk",
  "abcd1234",
  "1q2w3e4r",
  "iloveyou",
  "123123123",
  "11223344",
  "12341234",
]);

function isSequential(value: string): boolean {
  const codes = [...value].map((char) => char.charCodeAt(0));
  const steps = codes.slice(1).map((code, i) => code - (codes[i] ?? code));
  return (
    steps.every((step) => step === 1) || steps.every((step) => step === -1)
  );
}

/**
 * Returns a reason (in Arabic) why the password is too weak, or null if it is
 * acceptable. Managers set passwords for staff, so this blocks the obvious ones.
 */
export function passwordProblem(
  password: string,
  employeeNo?: string,
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `كلمة المرور ${PASSWORD_MIN_LENGTH} خانات على الأقل`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_LENGTH) {
    return "كلمة المرور طويلة جداً";
  }
  if (/^(.)\1+$/.test(password)) {
    return "كلمة المرور ضعيفة: حرف أو رقم واحد مكرر";
  }
  if (isSequential(password)) {
    return "كلمة المرور ضعيفة: أرقام أو حروف متتالية";
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "كلمة المرور شائعة جداً";
  }
  if (employeeNo && password === employeeNo) {
    return "لا تجعل كلمة المرور مثل رقم الموظف";
  }
  return null;
}
