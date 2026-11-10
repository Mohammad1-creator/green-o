"use client";

import { CameraIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, firstFieldError } from "@/lib/action-state";
import { prepareImage } from "@/lib/images/compress";
import { createClient } from "@/lib/supabase/browser";

import {
  addCommentAction,
  addReminderAction,
  deleteAttachmentAction,
  deleteReminderAction,
  registerAttachmentAction,
} from "../collab-actions";

export function CommentForm({ taskId }: { taskId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addCommentAction,
    null,
  );
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      action={async (formData) => {
        await formAction(formData);
        form.current?.reset();
      }}
      className="space-y-2"
      noValidate
    >
      <input type="hidden" name="taskId" value={taskId} />
      <Field data-invalid={Boolean(firstFieldError(state, "body"))}>
        <FieldLabel htmlFor={`comment-${taskId}`}>تعليق جديد</FieldLabel>
        <Textarea
          id={`comment-${taskId}`}
          name="body"
          rows={2}
          maxLength={2000}
          required
        />
        <FieldError>{firstFieldError(state, "body")}</FieldError>
      </Field>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <Spinner /> : null}
        إضافة التعليق
      </Button>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </form>
  );
}

/** Takes or picks a photo, shrinks it, uploads it, then records it. */
export function PhotoUploader({ taskId }: { taskId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const image = await prepareImage(file);
      if (!image) {
        toast.error("صيغة الصورة غير مدعومة. استخدم JPEG أو PNG.");
        return;
      }
      const path = `tasks/${taskId}/${crypto.randomUUID()}.${image.extension}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("attachments")
        .upload(path, image.blob, {
          contentType: image.mimeType,
          upsert: false,
        });
      if (error) {
        toast.error("تعذّر رفع الصورة. تحقق من الاتصال وحاول مرة أخرى.");
        return;
      }
      const result = await registerAttachmentAction({
        taskId,
        path,
        mimeType: image.mimeType,
        size: image.blob.size,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("أُرفقت الصورة");
      router.refresh();
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        id={`photo-${taskId}`}
        aria-label="اختيار صورة"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? <Spinner /> : <CameraIcon />}
        {busy ? "جارٍ رفع الصورة…" : "إرفاق صورة"}
      </Button>
    </div>
  );
}

export function DeletePhotoForm({
  taskId,
  attachmentId,
}: {
  taskId: string;
  attachmentId: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    deleteAttachmentAction,
    null,
  );
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("حذف هذه الصورة نهائياً؟")) event.preventDefault();
      }}
    >
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="attachmentId" value={attachmentId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        aria-label="حذف الصورة"
      >
        <Trash2Icon />
      </Button>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </form>
  );
}

export function AddReminderForm({ taskId }: { taskId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addReminderAction,
    null,
  );
  return (
    <form action={formAction} className="space-y-2" noValidate>
      <input type="hidden" name="taskId" value={taskId} />
      <Field data-invalid={Boolean(firstFieldError(state, "remindAt"))}>
        <FieldLabel htmlFor={`reminder-${taskId}`}>
          وقت التذكير (بتوقيت المصنع)
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Input
            id={`reminder-${taskId}`}
            name="remindAt"
            type="datetime-local"
            dir="ltr"
            className="w-auto text-start"
            required
          />
          <Button type="submit" variant="outline" disabled={pending}>
            إضافة تذكير
          </Button>
        </div>
        <FieldError>{firstFieldError(state, "remindAt")}</FieldError>
      </Field>
      <FormMessage state={state} />
    </form>
  );
}

export function DeleteReminderForm({
  taskId,
  reminderId,
}: {
  taskId: string;
  reminderId: string;
}) {
  const [, formAction, pending] = useActionState<ActionState, FormData>(
    deleteReminderAction,
    null,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="reminderId" value={reminderId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        حذف
      </Button>
    </form>
  );
}
