/**
 * Writes <dir>/manifest.json for a backup folder: row counts of the main
 * tables, the audit chain's last row, and a SHA-256 for every file.
 * verify-restore.mts compares a restored project with it.
 *
 *   node scripts/backup/manifest.mts <dir>
 */
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { adminClientFromEnv, fail } from "../lib/supabase-admin.mts";

/** Tables whose row counts a restore must reproduce. */
export const COUNTED_TABLES = [
  "departments",
  "profiles",
  "employee_details",
  "teams",
  "tasks",
  "task_events",
  "task_comments",
  "attachments",
  "machines",
  "fault_reports",
  "pm_plans",
  "spec_definitions",
  "products",
  "stages",
  "production_orders",
  "order_stages",
  "stage_entries",
] as const;

const dir = process.argv[2];
if (!dir) fail("Usage: node scripts/backup/manifest.mts <dir>");
const { supabase } = adminClientFromEnv();

const counts: Record<string, number> = {};
for (const table of COUNTED_TABLES) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  counts[table] = count ?? 0;
}

const { data: head, error: headError } = await supabase.rpc("audit_chain_head");
if (headError) throw headError;
const { data: environment } = await supabase.rpc("environment_marker");

const files: Record<string, { bytes: number; sha256: string }> = {};
for (const name of [
  "roles.sql",
  "schema.sql",
  "data.sql",
  "storage/storage-manifest.json",
]) {
  const full = path.join(dir, name);
  const bytes = await readFile(full);
  files[name] = {
    bytes: (await stat(full)).size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
const storage = JSON.parse(
  await readFile(path.join(dir, "storage", "storage-manifest.json"), "utf8"),
) as { files: { size: number }[] };

const manifest = {
  createdAt: new Date().toISOString(),
  environment,
  counts,
  audit: head?.[0] ?? { last_id: null, last_hash: null },
  storage: {
    files: storage.files.length,
    bytes: storage.files.reduce((sum, file) => sum + file.size, 0),
  },
  files,
};
await writeFile(
  path.join(dir, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(
  `Manifest: ${Object.values(counts).reduce((a, b) => a + b, 0)} rows counted, audit #${manifest.audit.last_id}, ${manifest.storage.files} files.`,
);
