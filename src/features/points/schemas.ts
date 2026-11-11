import { z } from "zod";

import { formText, optionalFormText } from "@/lib/form-schemas";

export const POINTS_MIN = 1;
export const POINTS_MAX = 1000;
/** Form field name for one person's points. */
export const pointsField = (userId: string) => `points.${userId}`;

const POINTS_MESSAGE = `النقاط رقم صحيح من ${POINTS_MIN} إلى ${POINTS_MAX}`;

export type ParsedAwards =
  | {
      ok: true;
      taskId: string;
      awards: { userId: string; points: number }[];
      note: string | null;
    }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

/**
 * Reads the award form: one optional "points.<user id>" field per person.
 * Empty fields are skipped; at least one person must get points.
 */
export function parseAwards(fields: Record<string, string>): ParsedAwards {
  const base = z
    .object({ taskId: z.uuid(), note: optionalFormText(500) })
    .safeParse(fields);
  if (!base.success) return { ok: false, message: "طلب غير صالح" };

  const awards: { userId: string; points: number }[] = [];
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(fields)) {
    if (!key.startsWith("points.")) continue;
    const userId = key.slice("points.".length);
    if (!z.uuid().safeParse(userId).success) {
      return { ok: false, message: "طلب غير صالح" };
    }
    const value = formText.parse(raw);
    if (value === "") continue;
    const points = /^\d+$/.test(value) ? Number(value) : NaN;
    if (
      !Number.isInteger(points) ||
      points < POINTS_MIN ||
      points > POINTS_MAX
    ) {
      fieldErrors[key] = [POINTS_MESSAGE];
      continue;
    }
    awards.push({ userId, points });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: POINTS_MESSAGE, fieldErrors };
  }
  if (awards.length === 0) {
    return { ok: false, message: "اكتب نقاط موظف واحد على الأقل" };
  }
  return { ok: true, taskId: base.data.taskId, awards, note: base.data.note };
}
