"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm } from "@/components/action-form";
import { type ActionState, firstFieldError } from "@/lib/action-state";

import {
  addCommentAction,
  addReminderAction,
  deleteAttachmentAction,
  deleteReminderAction,
} from "../collab-actions";

export function CommentForm({ taskId }: { taskId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addCommentAction,
    null,
  );
  return (
    <ActionForm
      action={formAction}
      state={state}
      resetOnSuccess
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
    </ActionForm>
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
    <ActionForm action={formAction} confirm="حذف هذه الصورة نهائياً؟">
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
    </ActionForm>
  );
}

export function AddReminderForm({ taskId }: { taskId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    addReminderAction,
    null,
  );
  return (
    <ActionForm
      action={formAction}
      state={state}
      resetOnSuccess
      className="space-y-2"
      noValidate
    >
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
    </ActionForm>
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
    <ActionForm action={formAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="reminderId" value={reminderId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        حذف
      </Button>
    </ActionForm>
  );
}
