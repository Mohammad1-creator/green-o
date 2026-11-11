// Puts (or removes) a tiny image in Storage, so the CI backup round trip
// always has a file to copy and check.
//   node scripts/ci/storage-probe.mjs put|remove
import { createClient } from "@supabase/supabase-js";

const PATH = "ci/round-trip.png";
// A valid 1x1 PNG: the attachments bucket accepts images only.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const bucket = supabase.storage.from("attachments");
const { error } =
  process.argv[2] === "remove"
    ? await bucket.remove([PATH])
    : await bucket.upload(PATH, PNG, {
        contentType: "image/png",
        upsert: true,
      });
if (error) {
  console.error(`Storage probe failed: ${error.message}`);
  process.exit(1);
}
console.log(
  process.argv[2] === "remove" ? "Probe removed." : "Probe uploaded.",
);
