// Copies stdin to stdout with anything key-shaped masked, so CI logs can be
// published without tripping secret scanning.
//   some-command | node scripts/ci/redact.mjs
import { createInterface } from "node:readline";

const RULES = [
  // JSON Web Tokens
  [/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<jwt>"],
  // Supabase API keys
  [/sb_(secret|publishable)_[\w-]+/g, "sb_$1_<hidden>"],
  // "Secret key: value", "S3 Access Key = value", "password: value"
  [/((?:secret|key|password|token)[^:=\n]{0,30}[:=]\s*)\S+/gi, "$1<hidden>"],
  // Long hex or base64 runs (signing keys, S3 secrets)
  [/\b[A-Fa-f0-9]{32,}\b/g, "<hex>"],
];

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  let masked = line;
  for (const [pattern, replacement] of RULES)
    masked = masked.replace(pattern, replacement);
  process.stdout.write(`${masked}\n`);
}
