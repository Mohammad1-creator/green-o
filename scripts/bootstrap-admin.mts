/**
 * Creates the first general manager of a new environment. Run once per
 * environment, with that environment's .env values:
 *
 *   npm run bootstrap:admin
 *
 * It asks for the name, employee number and password in the terminal.
 */
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

import { passwordProblem } from "../src/lib/auth/password-policy.ts";

import { adminClientFromEnv, fail, staffEmail } from "./lib/supabase-admin.mts";

/** Reads a line without echoing it (falls back to a visible prompt). */
async function askHidden(question: string): Promise<string> {
  if (!stdin.isTTY) {
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(question);
    rl.close();
    return answer;
  }
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve) => {
    let value = "";
    const onData = (char: string) => {
      if (char === "\r" || char === "\n" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        process.exit(130);
      } else if (char === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on("data", onData);
  });
}

const { supabase } = adminClientFromEnv();

const rl = createInterface({ input: stdin, output: stdout });
const fullName = (await rl.question("الاسم الكامل للمدير العام: ")).trim();
const employeeNo = (await rl.question("رقم الموظف (أرقام فقط): ")).trim();
rl.close();

if (fullName.length < 2) fail("الاسم قصير جداً.");
if (!/^[0-9]{1,10}$/.test(employeeNo))
  fail("رقم الموظف أرقام فقط، حتى 10 أرقام.");

const password = await askHidden("كلمة المرور: ");
const problem = passwordProblem(password, employeeNo);
if (problem) fail(problem);
const again = await askHidden("أعد كتابة كلمة المرور: ");
if (again !== password) fail("كلمتا المرور غير متطابقتين.");

const { data: created, error: authError } =
  await supabase.auth.admin.createUser({
    email: staffEmail(employeeNo),
    password,
    email_confirm: true,
  });
if (authError || !created.user)
  fail(`تعذّر إنشاء حساب الدخول: ${authError?.message ?? ""}`);

const { error } = await supabase.rpc("bootstrap_general_manager", {
  p_user_id: created.user.id,
  p_full_name: fullName,
  p_employee_no: employeeNo,
});
if (error) {
  await supabase.auth.admin.deleteUser(created.user.id);
  fail(`لم يُنشأ المدير العام: ${error.message}`);
}

console.log(`أُنشئ المدير العام. سجّل الدخول برقم الموظف ${employeeNo}.`);
