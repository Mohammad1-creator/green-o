import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoGrid } from "@/features/attachments/photo-grid";
import { PhotoUploader } from "@/features/attachments/photo-uploader";
import { listPhotos } from "@/features/attachments/queries";
import { TaskStatusBadge } from "@/features/tasks/components/task-status-badge";
import { taskCode } from "@/features/tasks/labels";
import { formatDateTime } from "@/lib/format";

import type { getFault } from "../queries";

import { FaultStatusBadge } from "./badges";

type Fault = NonNullable<Awaited<ReturnType<typeof getFault>>>;

/** The report itself, its photos and its repairs; shared by both apps. */
export async function FaultDetails({
  fault,
  timeZone,
  canAddPhotos,
  taskHref,
}: {
  fault: Fault;
  timeZone: string;
  canAddPhotos: boolean;
  taskHref: (taskId: string) => string;
}) {
  const photos = await listPhotos({ faultId: fault.id });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <FaultStatusBadge
              status={fault.status}
              stopped={fault.machine_stopped}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="whitespace-pre-line">{fault.description}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-muted-foreground">الآلة</dt>
            <dd>
              {fault.machine?.name}{" "}
              <span className="text-muted-foreground" dir="ltr">
                ({fault.machine?.code})
              </span>
            </dd>
            <dt className="text-muted-foreground">المبلِّغ</dt>
            <dd>
              {fault.reporter?.full_name}
              {fault.department ? ` · ${fault.department.name}` : ""}
            </dd>
            <dt className="text-muted-foreground">الوقت</dt>
            <dd>{formatDateTime(fault.created_at, timeZone)}</dd>
            {fault.rejection_reason ? (
              <>
                <dt className="text-muted-foreground">سبب الرفض</dt>
                <dd>{fault.rejection_reason}</dd>
              </>
            ) : null}
            {fault.resolved_at ? (
              <>
                <dt className="text-muted-foreground">أُصلح في</dt>
                <dd>
                  {formatDateTime(fault.resolved_at, timeZone)}
                  {fault.resolution_notes ? ` · ${fault.resolution_notes}` : ""}
                </dd>
              </>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الصور</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhotoGrid photos={photos} timeZone={timeZone} label="صور البلاغ" />
          {canAddPhotos ? (
            <PhotoUploader folder="faults" ownerId={fault.id} />
          ) : null}
        </CardContent>
      </Card>

      {fault.repairs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>مهام الإصلاح</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y" aria-label="مهام الإصلاح">
              {fault.repairs.map((repair) => (
                <li
                  key={repair.id}
                  className="flex flex-wrap items-center gap-2 py-2 text-sm"
                >
                  <Link
                    href={taskHref(repair.id)}
                    className="font-medium hover:underline"
                  >
                    {repair.title}
                  </Link>
                  <span className="text-muted-foreground" dir="ltr">
                    {taskCode(repair.number)}
                  </span>
                  <TaskStatusBadge status={repair.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
