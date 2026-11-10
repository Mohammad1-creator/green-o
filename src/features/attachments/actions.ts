"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/dal";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const photoSchema = z.object({
  folder: z.enum(["tasks", "faults"]),
  ownerId: z.uuid(),
  path: z.string().min(1).max(300),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

/** Records a photo the browser has just uploaded to a task's or a fault's folder. */
export async function registerPhotoAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await getCurrentUser())) {
    return { ok: false, message: "انتهت الجلسة. سجّل الدخول مرة أخرى." };
  }
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "الصورة غير صالحة" };
  const { folder, ownerId, path, mimeType, size } = parsed.data;

  const supabase = await createClient();
  const { error } =
    folder === "tasks"
      ? await supabase.rpc("register_task_attachment", {
          p_task_id: ownerId,
          p_path: path,
          p_mime_type: mimeType,
          p_size_bytes: size,
        })
      : await supabase.rpc("register_fault_attachment", {
          p_fault_id: ownerId,
          p_path: path,
          p_mime_type: mimeType,
          p_size_bytes: size,
        });
  if (error) return { ok: false, message: toUserMessage(error) };

  if (folder === "tasks") {
    revalidatePath(`/admin/tasks/${ownerId}`);
    revalidatePath(`/m/tasks/${ownerId}`);
  } else {
    revalidatePath(`/admin/maintenance/faults/${ownerId}`);
    revalidatePath(`/m/faults/${ownerId}`);
  }
  return { ok: true };
}
