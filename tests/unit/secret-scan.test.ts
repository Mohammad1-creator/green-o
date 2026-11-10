import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { scanForSecrets } from "../../scripts/lib/secret-scan.mts";

// Fake secrets are assembled at runtime, so no secret-looking text is committed.
const fakeSupabaseSecret = ["sb", "secret", "x".repeat(24)].join("_");

function fakeJwt(payload: object): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.${"s".repeat(32)}`;
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "secret-scan-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("scanForSecrets", () => {
  it("passes clean build output", async () => {
    await writeFile(path.join(dir, "app.js"), 'console.log("مرحبا")');
    expect(await scanForSecrets([dir], {})).toEqual([]);
  });

  it("finds a Supabase secret key", async () => {
    await writeFile(
      path.join(dir, "chunk.js"),
      `const k = "${fakeSupabaseSecret}";`,
    );
    const findings = await scanForSecrets([dir], {});
    expect(findings).toHaveLength(1);
    expect(findings[0]?.rule).toContain("sb_secret_");
  });

  it("finds a service_role JWT but not a public anon JWT", async () => {
    await writeFile(path.join(dir, "anon.js"), fakeJwt({ role: "anon" }));
    await writeFile(
      path.join(dir, "admin.js"),
      fakeJwt({ role: "service_role" }),
    );
    const findings = await scanForSecrets([dir], {});
    expect(findings.map((f) => path.basename(f.file))).toEqual(["admin.js"]);
  });

  it("finds a private key block", async () => {
    await writeFile(
      path.join(dir, "page.html"),
      "-----BEGIN EC PRIVATE KEY-----",
    );
    expect(await scanForSecrets([dir], {})).toHaveLength(1);
  });

  it("finds the value of a secret environment variable", async () => {
    const value = "a-long-random-dispatch-secret";
    await writeFile(path.join(dir, "page.rsc"), `data:${value}`);
    const findings = await scanForSecrets([dir], {
      PUSH_DISPATCH_SECRET: value,
    });
    expect(findings).toEqual([
      {
        file: path.join(dir, "page.rsc"),
        rule: "value of PUSH_DISPATCH_SECRET",
      },
    ]);
  });

  it("ignores values too short to be real secrets", async () => {
    await writeFile(path.join(dir, "app.js"), "dev");
    expect(
      await scanForSecrets([dir], { PUSH_DISPATCH_SECRET: "dev" }),
    ).toEqual([]);
  });

  it("scans nested folders and skips missing ones", async () => {
    await mkdir(path.join(dir, "a", "b"), { recursive: true });
    await writeFile(path.join(dir, "a", "b", "deep.js"), fakeSupabaseSecret);
    const findings = await scanForSecrets([dir, path.join(dir, "missing")], {});
    expect(findings).toHaveLength(1);
  });
});
