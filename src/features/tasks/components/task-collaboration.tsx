import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

import {
  listTaskComments,
  listTaskPhotos,
  listTaskReminders,
} from "../collab-queries";

import {
  AddReminderForm,
  CommentForm,
  DeletePhotoForm,
  DeleteReminderForm,
  PhotoUploader,
} from "./collab-forms";

/** Comments and photos, shown to everyone who can see the task. */
export async function TaskCollaboration({
  taskId,
  timeZone,
  isFinal,
  canManage,
}: {
  taskId: string;
  timeZone: string;
  isFinal: boolean;
  canManage: boolean;
}) {
  const [comments, photos] = await Promise.all([
    listTaskComments(taskId),
    listTaskPhotos(taskId),
  ]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>الصور</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد صور.</p>
          ) : (
            <ul
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              aria-label="صور المهمة"
            >
              {photos.map((photo) => (
                <li key={photo.id} className="space-y-1">
                  {photo.url ? (
                    <a
                      href={photo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      {/* Signed links change on every visit, so next/image adds nothing here. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={`صورة أرفقها ${photo.uploader?.full_name ?? ""}`}
                        className="aspect-square w-full rounded-lg border object-cover"
                        loading="lazy"
                      />
                    </a>
                  ) : null}
                  <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
                    <span className="truncate">
                      {photo.uploader?.full_name} ·{" "}
                      {formatDateTime(photo.created_at, timeZone)}
                    </span>
                    {canManage ? (
                      <DeletePhotoForm
                        taskId={taskId}
                        attachmentId={photo.id}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {isFinal ? null : <PhotoUploader taskId={taskId} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>التعليقات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تعليقات.</p>
          ) : (
            <ul className="space-y-3" aria-label="التعليقات">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm whitespace-pre-line">{comment.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {comment.author?.full_name} ·{" "}
                    {formatDateTime(comment.created_at, timeZone)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <CommentForm taskId={taskId} />
        </CardContent>
      </Card>
    </>
  );
}

/** Reminders: for the department's manager only. */
export async function TaskReminders({
  taskId,
  timeZone,
  isOpen,
}: {
  taskId: string;
  timeZone: string;
  isOpen: boolean;
}) {
  const reminders = await listTaskReminders(taskId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>التذكيرات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد تذكيرات.</p>
        ) : (
          <ul className="divide-y text-sm" aria-label="التذكيرات">
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <span>
                  {formatDateTime(reminder.remind_at, timeZone)}
                  {reminder.sent_at ? (
                    <span className="text-muted-foreground"> · أُرسل</span>
                  ) : null}
                </span>
                {reminder.sent_at ? null : (
                  <DeleteReminderForm
                    taskId={taskId}
                    reminderId={reminder.id}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {isOpen ? (
          <AddReminderForm taskId={taskId} />
        ) : (
          <p className="text-xs text-muted-foreground">
            التذكيرات للمهام المفتوحة فقط.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
