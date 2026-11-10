import { describe, expect, it } from "vitest";

import {
  dateToZonedLocal,
  zonedLocalToDate,
  zonedToday,
} from "@/lib/zoned-time";

describe("zonedLocalToDate", () => {
  it("reads a wall-clock time in Riyadh (UTC+3)", () => {
    expect(
      zonedLocalToDate("2026-11-12T14:00", "Asia/Riyadh").toISOString(),
    ).toBe("2026-11-12T11:00:00.000Z");
  });

  it("handles a zone with daylight saving time", () => {
    // London is on summer time (UTC+1) in July and on UTC in January.
    expect(
      zonedLocalToDate("2026-07-01T09:30", "Europe/London").toISOString(),
    ).toBe("2026-07-01T08:30:00.000Z");
    expect(
      zonedLocalToDate("2026-01-15T09:30", "Europe/London").toISOString(),
    ).toBe("2026-01-15T09:30:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(() => zonedLocalToDate("12/11/2026 14:00", "Asia/Riyadh")).toThrow(
      RangeError,
    );
  });
});

describe("dateToZonedLocal", () => {
  it("round-trips with zonedLocalToDate", () => {
    const local = "2026-11-12T23:45";
    expect(
      dateToZonedLocal(zonedLocalToDate(local, "Asia/Baghdad"), "Asia/Baghdad"),
    ).toBe(local);
  });

  it("crosses midnight in the zone", () => {
    expect(dateToZonedLocal("2026-11-10T22:30:00Z", "Asia/Riyadh")).toBe(
      "2026-11-11T01:30",
    );
  });
});

describe("zonedToday", () => {
  it("gives the factory's date, not the server's", () => {
    expect(zonedToday("Asia/Riyadh", new Date("2026-11-10T22:30:00Z"))).toBe(
      "2026-11-11",
    );
    expect(zonedToday("UTC", new Date("2026-11-10T22:30:00Z"))).toBe(
      "2026-11-10",
    );
  });
});
