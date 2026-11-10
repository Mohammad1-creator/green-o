import "server-only";

import { createClient } from "@/lib/supabase/server";

/** How long a photo link stays valid. */
const PHOTO_LINK_SECONDS = 60 * 60;

export async function listTaskComments(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_comments")
    .select("id, body, created_at, author:profiles(full_name)")
    .eq("task_id", taskId)
    .order("created_at");
  if (error) throw error;
  return data;
}

/** The task's photos with short-lived signed links (storage policies apply). */
export async function listTaskPhotos(taskId: string) {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("attachments")
    .select(
      "id, storage_path, created_at, uploader:profiles!attachments_uploaded_by_fkey(full_name)",
    )
    .eq("task_id", taskId)
    .is("deleted_at", null)
    .order("created_at");
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

export async function listTaskReminders(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_reminders")
    .select("id, remind_at, sent_at")
    .eq("task_id", taskId)
    .order("remind_at");
  if (error) throw error;
  return data;
}
