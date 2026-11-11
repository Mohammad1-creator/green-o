/**
 * Copies every Storage file to a folder, or back into a project.
 *
 *   node scripts/backup/storage.mts download <dir>
 *   node scripts/backup/storage.mts upload <dir>
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY. The download
 * writes <dir>/storage-manifest.json with each file's size and SHA-256.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import { adminClientFromEnv, fail } from "../lib/supabase-admin.mts";

export type StorageEntry = {
  bucket: string;
  path: string;
  size: number;
  sha256: string;
  contentType: string;
};

const [command, dir] = process.argv.slice(2);
if ((command !== "download" && command !== "upload") || !dir) {
  fail("Usage: node scripts/backup/storage.mts download|upload <dir>");
}
const { supabase } = adminClientFromEnv();

/** Every file path in a bucket (folders are listed with a null id). */
async function listFiles(
  client: SupabaseClient,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const files: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null)
        files.push(...(await listFiles(client, bucket, full)));
      else files.push(full);
    }
    if (data.length < 1000) break;
  }
  return files;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Keeps every path inside the backup folder. */
function safeJoin(root: string, ...parts: string[]): string {
  const target = path.resolve(root, ...parts);
  if (!target.startsWith(path.resolve(root) + path.sep)) {
    fail(`Refusing a path outside the backup folder: ${parts.join("/")}`);
  }
  return target;
}

if (command === "download") {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const entries: StorageEntry[] = [];
  for (const bucket of buckets) {
    for (const filePath of await listFiles(supabase, bucket.name)) {
      const { data: blob, error: downloadError } = await supabase.storage
        .from(bucket.name)
        .download(filePath);
      if (downloadError) throw downloadError;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const target = safeJoin(dir, bucket.name, filePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
      entries.push({
        bucket: bucket.name,
        path: filePath,
        size: bytes.byteLength,
        sha256: sha256(bytes),
        contentType: blob.type || "application/octet-stream",
      });
    }
  }
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "storage-manifest.json"),
    JSON.stringify(
      { buckets: buckets.map((b) => b.name), files: entries },
      null,
      2,
    ),
  );
  const bytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  console.log(`Downloaded ${entries.length} files (${bytes} bytes).`);
} else {
  const manifest = JSON.parse(
    await readFile(path.join(dir, "storage-manifest.json"), "utf8"),
  ) as { files: StorageEntry[] };
  let uploaded = 0;
  for (const entry of manifest.files) {
    const bytes = await readFile(safeJoin(dir, entry.bucket, entry.path));
    if (sha256(bytes) !== entry.sha256) {
      fail(`Checksum mismatch for ${entry.bucket}/${entry.path}`);
    }
    const { error } = await supabase.storage
      .from(entry.bucket)
      .upload(entry.path, bytes, {
        contentType: entry.contentType,
        upsert: true,
      });
    if (error) throw error;
    uploaded += 1;
  }
  console.log(`Uploaded ${uploaded} files.`);
}
