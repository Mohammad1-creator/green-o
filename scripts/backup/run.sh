#!/usr/bin/env bash
# Makes one encrypted backup of a Supabase project: the database (roles,
# schema and data, logins included), every Storage file, and a manifest.
# The archive is encrypted with age for BACKUP_AGE_RECIPIENT (a public key;
# only the holder of the private key can open it), then uploaded when S3
# settings are present. See docs/backup-restore.md.
#
# Needs:    DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
#           BACKUP_AGE_RECIPIENT; the age and supabase CLIs; Docker.
# Optional: BACKUP_S3_BUCKET, BACKUP_S3_ENDPOINT, AWS_ACCESS_KEY_ID,
#           AWS_SECRET_ACCESS_KEY (S3-compatible storage such as R2 or B2);
#           BACKUP_OUT_DIR (also keep the encrypted file and the manifest);
#           BACKUP_KEEP_DAYS (default 30), BACKUP_KEEP_MONTHS (default 12).
# Writes:   name=, location=, manifest= lines to $GITHUB_OUTPUT when set.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL}"
: "${NEXT_PUBLIC_SUPABASE_URL:?Set NEXT_PUBLIC_SUPABASE_URL}"
: "${SUPABASE_SECRET_KEY:?Set SUPABASE_SECRET_KEY}"
: "${BACKUP_AGE_RECIPIENT:?Set BACKUP_AGE_RECIPIENT (an age public key)}"
cli="${SUPABASE_CLI:-npx -y supabase@3.1.0}"

stamp=$(date -u +%Y-%m-%dT%H%M%SZ)
day=${stamp:0:10}
name="green-o-$stamp"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
dir="$work/$name"
mkdir -p "$dir"

echo "== database"
$cli db dump --db-url "$DATABASE_URL" -f "$dir/roles.sql" --role-only
$cli db dump --db-url "$DATABASE_URL" -f "$dir/schema.sql"
$cli db dump --db-url "$DATABASE_URL" -f "$dir/data.sql" --use-copy --data-only

echo "== storage"
node scripts/backup/storage.mts download "$dir/storage"

echo "== manifest"
node scripts/backup/manifest.mts "$dir"

echo "== encrypt"
tar -C "$work" -czf "$work/$name.tar.gz" "$name"
age -r "$BACKUP_AGE_RECIPIENT" -o "$work/$name.tar.gz.age" "$work/$name.tar.gz"
rm -f "$work/$name.tar.gz"
echo "Encrypted archive: $(stat -c %s "$work/$name.tar.gz.age") bytes"

location=""
if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  echo "== upload"
  s3=(aws s3 --endpoint-url "$BACKUP_S3_ENDPOINT")
  s3api=(aws s3api --endpoint-url "$BACKUP_S3_ENDPOINT")
  location="daily/$day/$name.tar.gz.age"
  "${s3[@]}" cp --only-show-errors "$work/$name.tar.gz.age" "s3://$BACKUP_S3_BUCKET/$location"
  "${s3[@]}" cp --only-show-errors "$dir/manifest.json" "s3://$BACKUP_S3_BUCKET/daily/$day/$name.manifest.json"
  # The first backup of each month is also kept as the monthly copy.
  month=${day:0:7}
  if ! "${s3api[@]}" list-objects-v2 --bucket "$BACKUP_S3_BUCKET" --prefix "monthly/$month/" \
       --query 'KeyCount' --output text | grep -qv '^0$'; then
    "${s3[@]}" cp --only-show-errors "$work/$name.tar.gz.age" "s3://$BACKUP_S3_BUCKET/monthly/$month/$name.tar.gz.age"
  fi

  echo "== retention"
  keep_daily=$(date -u -d "-${BACKUP_KEEP_DAYS:-30} days" +%Y-%m-%d)
  keep_monthly=$(date -u -d "-${BACKUP_KEEP_MONTHS:-12} months" +%Y-%m)
  "${s3api[@]}" list-objects-v2 --bucket "$BACKUP_S3_BUCKET" --prefix daily/ \
      --query 'Contents[].Key' --output text | tr '\t' '\n' | while read -r key; do
    [[ "$key" =~ ^daily/([0-9]{4}-[0-9]{2}-[0-9]{2})/ ]] || continue
    if [[ "${BASH_REMATCH[1]}" < "$keep_daily" ]]; then
      "${s3[@]}" rm --only-show-errors "s3://$BACKUP_S3_BUCKET/$key"
    fi
  done
  "${s3api[@]}" list-objects-v2 --bucket "$BACKUP_S3_BUCKET" --prefix monthly/ \
      --query 'Contents[].Key' --output text | tr '\t' '\n' | while read -r key; do
    [[ "$key" =~ ^monthly/([0-9]{4}-[0-9]{2})/ ]] || continue
    if [[ "${BASH_REMATCH[1]}" < "$keep_monthly" ]]; then
      "${s3[@]}" rm --only-show-errors "s3://$BACKUP_S3_BUCKET/$key"
    fi
  done
fi

# The manifest outlives the temporary folder, for recording the run.
out="${BACKUP_OUT_DIR:-${RUNNER_TEMP:-/tmp}}"
mkdir -p "$out"
cp "$dir/manifest.json" "$out/$name.manifest.json"
if [[ -n "${BACKUP_OUT_DIR:-}" ]]; then
  cp "$work/$name.tar.gz.age" "$BACKUP_OUT_DIR/"
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "name=$name"
    echo "location=$location"
    echo "manifest=$out/$name.manifest.json"
  } >> "$GITHUB_OUTPUT"
fi
echo "Backup $name done."
