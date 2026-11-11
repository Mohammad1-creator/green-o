import { z } from "zod";

export type AuditFilters = {
  from: string | null;
  to: string | null;
  actorId: string | null;
  table: string | null;
  action: string | null;
  recordId: string | null;
  beforeId: number | null;
};

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const table = z.string().regex(/^[a-z_]+\.[a-z_]+$/);
const action = z.string().regex(/^[a-z_]{1,40}$/);
const record = z.string().min(1).max(200);
const id = z
  .string()
  .regex(/^\d{1,18}$/)
  .transform(Number);

function pick<T>(
  schema: z.ZodType<T>,
  value: string | string[] | undefined,
): T | null {
  const result = schema.safeParse(
    typeof value === "string" ? value.trim() : undefined,
  );
  return result.success ? result.data : null;
}

/** The audit filters in the URL; anything malformed is ignored. */
export function parseAuditFilters(
  query: Record<string, string | string[] | undefined>,
): AuditFilters {
  return {
    from: pick(day, query.from),
    to: pick(day, query.to),
    actorId: pick(z.uuid(), query.actor),
    table: pick(table, query.table),
    action: pick(action, query.action),
    recordId: pick(record, query.record),
    beforeId: pick(id, query.before),
  };
}

/** The filters as a query string (without the page position). */
export function auditQuery(filters: AuditFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.actorId) params.set("actor", filters.actorId);
  if (filters.table) params.set("table", filters.table);
  if (filters.action) params.set("action", filters.action);
  if (filters.recordId) params.set("record", filters.recordId);
  return params.toString();
}
