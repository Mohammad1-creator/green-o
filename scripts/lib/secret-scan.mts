import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/** Environment variables whose values must never appear in build output. */
export const SECRET_ENV_NAMES = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_PASSWORD",
  "VAPID_PRIVATE_KEY",
  "PUSH_DISPATCH_SECRET",
] as const;

/** Shorter values are too likely to match ordinary text by accident. */
const MIN_SECRET_LENGTH = 12;

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
]);

export type Finding = { file: string; rule: string };

type Rule = { name: string; matches: (text: string) => boolean };

const PATTERN_RULES: Rule[] = [
  {
    name: "Supabase secret key (sb_secret_...)",
    matches: (text) => /sb_secret_[\w-]{8,}/.test(text),
  },
  {
    name: "private key block",
    matches: (text) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text),
  },
  {
    name: "JWT with the service_role claim",
    matches: containsServiceRoleJwt,
  },
];

function containsServiceRoleJwt(text: string): boolean {
  const jwt = /eyJ[\w-]{5,}\.(eyJ[\w-]{5,})\.[\w-]{10,}/g;
  for (const match of text.matchAll(jwt)) {
    const payload = Buffer.from(match[1] ?? "", "base64url").toString("utf8");
    if (/"role"\s*:\s*"service_role"/.test(payload)) return true;
  }
  return false;
}

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // A missing folder has nothing to scan.
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(fullPath);
    else if (entry.isFile()) yield fullPath;
  }
}

/**
 * Scans every text file under `roots` for secret patterns and for the
 * given secret values. Findings name the file and the rule, never the secret.
 */
export async function scanForSecrets(
  roots: string[],
  secrets: Record<string, string | undefined>,
): Promise<Finding[]> {
  const secretValues = Object.entries(secrets).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" && entry[1].length >= MIN_SECRET_LENGTH,
  );

  const findings: Finding[] = [];
  for (const root of roots) {
    for await (const file of walk(root)) {
      if (BINARY_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
      if ((await stat(file)).size > MAX_FILE_BYTES) continue;

      const text = await readFile(file, "utf8");
      for (const rule of PATTERN_RULES) {
        if (rule.matches(text)) findings.push({ file, rule: rule.name });
      }
      for (const [name, value] of secretValues) {
        if (text.includes(value))
          findings.push({ file, rule: `value of ${name}` });
      }
    }
  }
  return findings;
}
