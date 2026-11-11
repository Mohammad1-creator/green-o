/**
 * Checks a restored project against the backup it came from: row counts,
 * the audit chain (intact, and ending where the backup ended), and the
 * Storage files (each one present, with the same SHA-256).
 *
 *   node scripts/backup/verify-restore.mts <backup folder> [--same-project]
 *
 * Point NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY at the restored
 * project. Exits with 1 when anything differs. --same-project checks the
 * project the backup came from (CI): rows may have been added since.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { adminClientFromEnv, fail } from "../lib/supabase-admin.mts";

import type { StorageEntry } from "./storage.mts";

const dir = process.argv[2];
if (!dir) fail("Usage: node scripts/backup/verify-restore.mts <backup folder>");
const sameProject = process.argv.includes("--same-project");
const { supabase } = adminClientFromEnv();

const manifest = JSON.parse(
  await readFile(path.join(dir, "manifest.json"), "utf8"),
) as {
  counts: Record<string, number>;
  audit: { last_id: number | null; last_hash: string | null };
};
const storage = JSON.parse(
  await readFile(path.join(dir, "storage", "storage-manifest.json"), "utf8"),
) as { files: StorageEntry[] };

const problems: string[] = [];

for (const [table, expected] of Object.entries(manifest.counts)) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) problems.push(`${table}: ${error.message}`);
  else if (sameProject ? (count ?? 0) < expected : count !== expected) {
    problems.push(`${table}: ${count} rows, the backup had ${expected}`);
  }
}

const { data: chain, error: chainError } =
  await supabase.rpc("audit_chain_verify");
const result = chain?.[0];
if (chainError || !result) {
  problems.push(`audit chain: ${chainError?.message ?? "no result"}`);
} else if (!result.ok) {
  problems.push(
    `audit chain broken at #${result.first_bad_id}: ${result.problem}`,
  );
} else if (
  manifest.audit.last_id !== null &&
  (result.last_id ?? 0) < manifest.audit.last_id
) {
  problems.push(
    `audit chain ends at #${result.last_id}, the backup ended at #${manifest.audit.last_id}`,
  );
} else if (manifest.audit.last_id !== null) {
  // The restored chain must contain the backup's last row, unchanged.
  const { data: rows, error } = await supabase.rpc("audit_chain_head");
  if (error) problems.push(`audit head: ${error.message}`);
  else if (
    result.last_id === manifest.audit.last_id &&
    rows?.[0]?.last_hash !== manifest.audit.last_hash
  ) {
    problems.push("the audit chain's last hash differs from the backup's");
  }
}

let checkedFiles = 0;
for (const entry of storage.files) {
  const { data: blob, error } = await supabase.storage
    .from(entry.bucket)
    .download(entry.path);
  if (error) {
    problems.push(`file ${entry.bucket}/${entry.path}: ${error.message}`);
    continue;
  }
  const digest = createHash("sha256")
    .update(new Uint8Array(await blob.arrayBuffer()))
    .digest("hex");
  if (digest !== entry.sha256) {
    problems.push(`file ${entry.bucket}/${entry.path}: content differs`);
  }
  checkedFiles += 1;
}

if (problems.length > 0) {
  console.error(`Restore check FAILED (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  `Restore check passed: ${Object.keys(manifest.counts).length} tables, audit chain intact to #${result?.last_id}, ${checkedFiles} files.`,
);
