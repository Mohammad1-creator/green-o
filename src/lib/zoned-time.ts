// Converting between a wall-clock time in the factory time zone (what a
// <input type="datetime-local"> holds, e.g. "2026-11-12T14:00") and an
// absolute instant. No library: Intl knows every IANA time zone.

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function partsIn(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Minutes the zone is ahead of UTC at this instant (e.g. +180 for Riyadh). */
function offsetMinutes(instant: number, timeZone: string): number {
  const p = partsIn(instant, timeZone);
  const wallAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return Math.round((wallAsUtc - instant) / 60_000);
}

/** "2026-11-12T14:00" in the given zone → the matching instant. */
export function zonedLocalToDate(local: string, timeZone: string): Date {
  const match = LOCAL_PATTERN.exec(local);
  if (!match) throw new RangeError(`Invalid local date-time: ${local}`);
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes settle the offset across daylight-saving changes.
  const first = wallAsUtc - offsetMinutes(wallAsUtc, timeZone) * 60_000;
  const second = wallAsUtc - offsetMinutes(first, timeZone) * 60_000;
  return new Date(second);
}

/** An instant → "2026-11-12T14:00" in the given zone, for datetime-local inputs. */
export function dateToZonedLocal(
  value: Date | string,
  timeZone: string,
): string {
  const instant = new Date(value).getTime();
  const p = partsIn(instant, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Today's date in the zone, as "2026-11-12". */
export function zonedToday(timeZone: string, now: Date = new Date()): string {
  return dateToZonedLocal(now, timeZone).slice(0, 10);
}

/** "2026-11-12" moved by a number of days (negative goes back). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}
