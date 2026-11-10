/**
 * Fails when a secret shows up in the Next.js build output, which is what
 * browsers download or what the server renders for them.
 *
 * Run after `npm run build`:  npm run check:secrets
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { SECRET_ENV_NAMES, scanForSecrets } from "./lib/secret-scan.mts";

const buildDir = path.resolve(".next");
if (!existsSync(buildDir)) {
  console.error("No .next folder found. Run `npm run build` first.");
  process.exit(2);
}

const secrets = Object.fromEntries(
  SECRET_ENV_NAMES.map((name) => [name, process.env[name]]),
);

const findings = await scanForSecrets(
  [path.join(buildDir, "static"), path.join(buildDir, "server")],
  secrets,
);

if (findings.length > 0) {
  console.error("Secrets found in the build output:");
  for (const finding of findings) {
    console.error(
      `  - ${path.relative(process.cwd(), finding.file)}: ${finding.rule}`,
    );
  }
  process.exit(1);
}

console.log("No secrets found in the build output.");
