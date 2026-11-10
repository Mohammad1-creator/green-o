import { describe, expect, it } from "vitest";

import {
  buildPushPayload,
  isGoneStatus,
  vapidKeyToBytes,
} from "@/lib/push/payload";

describe("buildPushPayload", () => {
  it("keeps local links and fills in defaults", () => {
    expect(
      JSON.parse(
        buildPushPayload({
          id: "n1",
          title: "مهمة جديدة",
          body: null,
          url: "/m/tasks/1",
        }),
      ),
    ).toEqual({ id: "n1", title: "مهمة جديدة", body: "", url: "/m/tasks/1" });
  });

  it("never sends the user to another site", () => {
    const payload = JSON.parse(
      buildPushPayload({
        id: "n2",
        title: "x",
        body: "y",
        url: "https://evil.example",
      }),
    );
    expect(payload.url).toBe("/m/notifications");
  });
});

describe("isGoneStatus", () => {
  it("treats 404 and 410 as unsubscribed devices", () => {
    expect(isGoneStatus(404)).toBe(true);
    expect(isGoneStatus(410)).toBe(true);
    expect(isGoneStatus(429)).toBe(false);
    expect(isGoneStatus(undefined)).toBe(false);
  });
});

describe("vapidKeyToBytes", () => {
  it("decodes base64url", () => {
    expect(Array.from(vapidKeyToBytes("AQID_-8"))).toEqual([1, 2, 3, 255, 239]);
  });
});
