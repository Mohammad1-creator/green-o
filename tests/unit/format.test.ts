import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
  isValidTimeZone,
} from "@/lib/format";

const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/;

// 22:30 UTC on 10 November is already 01:30 on 11 November in Riyadh (UTC+3).
const LATE_EVENING_UTC = "2026-11-10T22:30:00Z";

describe("formatDate", () => {
  it("uses Western digits and the Gregorian calendar", () => {
    const text = formatDate(LATE_EVENING_UTC);
    expect(text).not.toMatch(ARABIC_INDIC_DIGITS);
    expect(text).toBe("11 نوفمبر 2026");
  });

  it("picks the day in the factory time zone", () => {
    expect(formatDate(LATE_EVENING_UTC, "Asia/Riyadh")).toBe("11 نوفمبر 2026");
    expect(formatDate(LATE_EVENING_UTC, "UTC")).toBe("10 نوفمبر 2026");
  });

  it("rejects invalid dates", () => {
    expect(() => formatDate("not a date")).toThrow(RangeError);
  });
});

describe("formatDateTime and formatTime", () => {
  it("show the time in the factory time zone with Western digits", () => {
    const dateTime = formatDateTime(LATE_EVENING_UTC);
    expect(dateTime).not.toMatch(ARABIC_INDIC_DIGITS);
    expect(dateTime).toContain("2026");
    expect(dateTime).toContain("1:30");
    expect(formatTime(LATE_EVENING_UTC)).toContain("1:30");
  });
});

describe("formatNumber", () => {
  it("uses Western digits with thousands separators", () => {
    expect(formatNumber(1234567.891)).toBe("1,234,567.891");
  });

  it("keeps at most three decimal places", () => {
    expect(formatNumber(2.34567)).toBe("2.346");
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA zones and rejects unknown names", () => {
    expect(isValidTimeZone("Asia/Riyadh")).toBe(true);
    expect(isValidTimeZone("Asia/Baghdad")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
  });
});
