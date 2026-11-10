import { z } from "zod";

const text = z
  .string()
  .optional()
  .transform((value) => (value ?? "").trim());

export const titleSchema = text.pipe(
  z.string().min(1, "اكتب عنوان المهمة").max(200, "العنوان طويل جداً"),
);

export const descriptionSchema = text
  .pipe(z.string().max(5000, "الوصف طويل جداً"))
  .transform((value) => value || null);

/** A datetime-local value ("2026-11-12T14:00") or empty. */
export const localDueSchema = text.pipe(
  z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/, "اختر موعداً صحيحاً")
    .transform((value) => value || null),
);

const optionalUuid = text
  .transform((value) => value || null)
  .pipe(z.uuid().nullable());

export const assignmentSchema = z
  .object({
    assignMode: z.enum(["person", "team"], "اختر طريقة الإسناد"),
    assigneeId: optionalUuid,
    teamId: optionalUuid,
  })
  .superRefine((value, ctx) => {
    if (value.assignMode === "person" && !value.assigneeId) {
      ctx.addIssue({
        code: "custom",
        path: ["assigneeId"],
        message: "اختر الموظف",
      });
    }
    if (value.assignMode === "team" && !value.teamId) {
      ctx.addIssue({
        code: "custom",
        path: ["teamId"],
        message: "اختر الفريق",
      });
    }
  });

export const createTaskSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    due: localDueSchema,
    departmentId: optionalUuid,
  })
  .and(assignmentSchema);

export const updateTaskSchema = z.object({
  taskId: z.uuid(),
  title: titleSchema,
  description: descriptionSchema,
  due: localDueSchema,
});

export const reassignTaskSchema = z
  .object({ taskId: z.uuid() })
  .and(assignmentSchema);

export const taskIdSchema = z.object({ taskId: z.uuid() });

export const reasonSchema = z.object({
  taskId: z.uuid(),
  reason: text.pipe(
    z
      .string()
      .min(3, "اكتب السبب (3 أحرف على الأقل)")
      .max(2000, "النص طويل جداً"),
  ),
});

export const submitSchema = z.object({
  taskId: z.uuid(),
  note: text
    .pipe(z.string().max(2000, "الملاحظة طويلة جداً"))
    .transform((value) => value || null),
});
