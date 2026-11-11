/**
 * Records a backup run in the project's backup_runs table.
 *
 *   node scripts/backup/record-run.mts succeeded <manifest.json>
 *   node scripts/backup/record-run.mts failed "<what went wrong>"
 *
 * Reads BACKUP_STARTED_AT, BACKUP_LOCATION and RUN_URL when set.
 */
import { readFile } from "node:fs/promises";

import { adminClientFromEnv, fail } from "../lib/supabase-admin.mts";

const [status, detail] = process.argv.slice(2);
if (status !== "succeeded" && status !== "failed") {
  fail(
    "Usage: node scripts/backup/record-run.mts succeeded <manifest> | failed <error>",
  );
}
const { supabase } = adminClientFromEnv();

type Manifest = {
  audit: { last_id: number | null; last_hash: string | null };
  storage: { files: number; bytes: number };
  files: Record<string, { bytes: number }>;
};
const manifest: Manifest | null =
  status === "succeeded" && detail
    ? (JSON.parse(await readFile(detail, "utf8")) as Manifest)
    : null;

const { error } = await supabase.rpc("record_backup_run", {
  p_status: status,
  p_started_at: process.env.BACKUP_STARTED_AT ?? new Date().toISOString(),
  p_database_bytes: manifest
    ? Object.entries(manifest.files)
        .filter(([name]) => name.endsWith(".sql"))
        .reduce((sum, [, file]) => sum + file.bytes, 0)
    : undefined,
  p_storage_bytes: manifest?.storage.bytes,
  p_storage_files: manifest?.storage.files,
  p_audit_last_id: manifest?.audit.last_id ?? undefined,
  p_audit_last_hash: manifest?.audit.last_hash ?? undefined,
  p_location: process.env.BACKUP_LOCATION || undefined,
  p_run_url: process.env.RUN_URL || undefined,
  p_error: status === "failed" ? (detail ?? "unknown error") : undefined,
});
if (error) fail(`Could not record the run: ${error.message}`);
console.log(`Recorded a ${status} backup run.`);
