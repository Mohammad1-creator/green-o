import { describe, expect, it } from "vitest";

import nextConfig, { contentSecurityPolicy } from "../../next.config";

describe("contentSecurityPolicy", () => {
  it("lets the browser reach only this app and the project's Supabase", () => {
    const policy = contentSecurityPolicy({
      supabaseUrl: "https://abcd.supabase.co",
      development: false,
    });
    expect(policy).toContain(
      "connect-src 'self' https://abcd.supabase.co wss://abcd.supabase.co",
    );
    expect(policy).toContain(
      "img-src 'self' blob: data: https://abcd.supabase.co",
    );
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("works against a local Supabase over plain http", () => {
    const policy = contentSecurityPolicy({
      supabaseUrl: "http://127.0.0.1:54321",
      development: true,
    });
    expect(policy).toContain("ws://127.0.0.1:54321");
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});

describe("headers", () => {
  it("apply to every route", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((rule) => rule.source === "/(.*)");
    const keys = all?.headers.map((header) => header.key) ?? [];
    expect(keys).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
      ]),
    );
  });
});
