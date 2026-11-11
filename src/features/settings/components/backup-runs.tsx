import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes, formatDateTime, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const STALE_HOURS = 36;

/** The latest runs (row level security: the general manager only). */
async function loadBackupRuns() {
  const supabase = await createClient();
  const { data: runs, error } = await supabase
    .from("backup_runs")
    .select(
      "id, environment, status, finished_at, database_bytes, storage_bytes, storage_files, run_url, error",
    )
    .order("finished_at", { ascending: false })
    .limit(15);
  if (error) throw error;
  const lastSuccess = runs.find((run) => run.status === "succeeded");
  const stale =
    !lastSuccess ||
    Date.now() - new Date(lastSuccess.finished_at).getTime() >
      STALE_HOURS * 3_600_000;
  return { runs, lastSuccess, stale };
}

export async function BackupRuns({ timeZone }: { timeZone: string }) {
  const { runs, lastSuccess, stale } = await loadBackupRuns();

  return (
    <Card id="backups" className="max-w-4xl">
      <CardHeader>
        <CardTitle>النسخ الاحتياطي</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {runs.length === 0 ? (
          <Alert>
            <AlertDescription>
              لم تُسجَّل أي نسخة احتياطية بعد. خطوات الإعداد في
              docs/backup-restore.md.
            </AlertDescription>
          </Alert>
        ) : stale || !lastSuccess ? (
          <Alert variant="destructive">
            <AlertDescription>
              لا توجد نسخة احتياطية ناجحة خلال آخر {formatNumber(STALE_HOURS)}{" "}
              ساعة. راجع سير «Backup» في GitHub Actions.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-sm">
            آخر نسخة ناجحة: {formatDateTime(lastSuccess.finished_at, timeZone)}.
          </p>
        )}
        {runs.length > 0 ? (
          <Table aria-label="النسخ الاحتياطية">
            <TableHeader>
              <TableRow>
                <TableHead>الوقت</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>القاعدة</TableHead>
                <TableHead>الملفات</TableHead>
                <TableHead>السجل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    {formatDateTime(run.finished_at, timeZone)}
                    <div className="text-xs text-muted-foreground">
                      {run.environment}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        run.status === "succeeded" ? "secondary" : "destructive"
                      }
                    >
                      {run.status === "succeeded" ? "نجحت" : "فشلت"}
                    </Badge>
                    {run.error ? (
                      <div className="mt-1 max-w-xs text-xs text-muted-foreground">
                        {run.error}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {run.database_bytes === null
                      ? "—"
                      : formatBytes(run.database_bytes)}
                  </TableCell>
                  <TableCell>
                    {run.storage_files === null
                      ? "—"
                      : `${formatNumber(run.storage_files)} · ${formatBytes(run.storage_bytes ?? 0)}`}
                  </TableCell>
                  <TableCell>
                    {run.run_url ? (
                      <a
                        href={run.run_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        فتح
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
