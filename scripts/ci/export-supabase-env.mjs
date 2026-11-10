// Reads `supabase status -o env` output on stdin and appends the app's
// variable names to $GITHUB_ENV, masking the key values in the job log.
//   supabase status -o env | node scripts/ci/export-supabase-env.mjs
import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";

const status = {};
for await (const line of createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
})) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) status[match[1]] = match[2].replace(/^"|"$/g, "");
}

const pick = (...names) => names.map((name) => status[name]).find(Boolean);
const values = {
  NEXT_PUBLIC_SUPABASE_URL: pick("API_URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pick("PUBLISHABLE_KEY", "ANON_KEY"),
  SUPABASE_SECRET_KEY: pick("SECRET_KEY", "SERVICE_ROLE_KEY"),
  DATABASE_URL: pick("DB_URL"),
};

const missing = Object.entries(values)
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (missing.length > 0) {
  console.error(`Missing from supabase status: ${missing.join(", ")}`);
  process.exit(1);
}

const lines = [];
for (const [name, value] of Object.entries(values)) {
  if (name !== "NEXT_PUBLIC_SUPABASE_URL") console.log(`::add-mask::${value}`);
  lines.push(`${name}=${value}`);
}
appendFileSync(process.env.GITHUB_ENV, `${lines.join("\n")}\n`);
console.log(`Exported ${Object.keys(values).join(", ")}`);
