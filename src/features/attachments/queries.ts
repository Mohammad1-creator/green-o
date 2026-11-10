import "server-only";

import { createClient } from "@/lib/supabase/server";

/** How long a photo link stays valid. */
const PHOTO_LINK_SECONDS = 60 * 60;

/** Photos of a task or a fault, with short-lived signed links. */
export async function listPhotos(
  owner: { taskId: string } | { faultId: string },
) {
  const supabase = await createClient();
  let query = supabase
    .from("attachments")
    .select(
      "id, storage_path, created_at, uploader:profiles!attachments_uploaded_by_fkey(full_name)",
    )
    .is("deleted_at", null)
    .order("created_at");
  query =
    "taskId" in owner
      ? query.eq("task_id", owner.taskId)
      : query.eq("fault_report_id", owner.faultId);

  const { data: rows, error } = await query;
  if (error) throw error;
  if (rows.length === 0) return [];

  const { data: links, error: linkError } = await supabase.storage
    .from("attachments")
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      PHOTO_LINK_SECONDS,
    );
  if (linkError) throw linkError;

  const byPath = new Map(links.map((link) => [link.path, link.signedUrl]));
  return rows.map((row) => ({
    ...row,
    url: byPath.get(row.storage_path) ?? null,
  }));
}

export type Photo = Awaited<ReturnType<typeof listPhotos>>[number];
