import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TaskPointsRow = {
  id: string;
  user_id: string;
  points: number;
  note: string | null;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
  person: { full_name: string } | null;
  awarder: { full_name: string } | null;
  voider: { full_name: string } | null;
};

/** The awards on one task, newest first. Empty for anyone but its managers. */
export async function getTaskPoints(taskId: string): Promise<TaskPointsRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_points")
    .select(
      "id, user_id, points, note, created_at, voided_at, void_reason, person:profiles!task_points_user_id_fkey(full_name), awarder:profiles!task_points_awarded_by_fkey(full_name), voider:profiles!task_points_voided_by_fkey(full_name)",
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
