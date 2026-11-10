/**
 * Arabic formatting with Western digits (123) and the Gregorian calendar.
 * Plain "ar-SA" would give Arabic-Indic digits (١٢٣), so the locale pins
 * the numbering system (nu-latn) and the calendar (ca-gregory) explicitly.
 */
export const APP_LOCALE = "ar-u-nu-latn-ca-gregory";

/** Placeholder until the factory time zone is read from the settings table. */
export const DEFAULT_TIME_ZONE = "Asia/Riyadh";

type DateInput = Date | string | number;

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(APP_LOCALE, { ...options, timeZone });
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

function toDate(value: DateInput): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid date: ${String(value)}`);
  }
  return date;
}

/** "11 نوفمبر 2026" */
export function formatDate(
  value: DateInput,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return dateFormatter(timeZone, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(toDate(value));
}

/** "11 نوفمبر 2026 في 1:30 ص" */
export function formatDateTime(
  value: DateInput,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return dateFormatter(timeZone, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(toDate(value));
}

/** "1:30 ص" */
export function formatTime(
  value: DateInput,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return dateFormatter(timeZone, {
    hour: "numeric",
    minute: "2-digit",
  }).format(toDate(value));
}

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A calendar date without a time ("2026-11-12", as Postgres sends a date
 * column) → "12 نوفمبر 2026". It is not an instant, so no time zone applies.
 */
export function formatCalendarDate(value: string): string {
  if (!CALENDAR_DATE.test(value)) {
    throw new RangeError(`Invalid calendar date: ${value}`);
  }
  return formatDate(`${value}T12:00:00Z`, "UTC");
}

const numberFormatter = new Intl.NumberFormat(APP_LOCALE, {
  maximumFractionDigits: 3,
});

const percentFormatter = new Intl.NumberFormat(APP_LOCALE, {
  style: "percent",
  maximumFractionDigits: 0,
});

/** 0.8 → "80%". */
export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio);
}

/** "1,234,567.891" — quantities may be decimal, so up to 3 fraction digits. */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** True when the runtime knows this IANA time zone (e.g. "Asia/Riyadh"). */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
