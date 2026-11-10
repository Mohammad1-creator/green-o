import "server-only";

import { createClient } from "@/lib/supabase/server";

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
