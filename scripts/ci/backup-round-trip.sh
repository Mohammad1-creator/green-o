#!/usr/bin/env bash
# CI check of the backup tooling against the local Supabase: back up with a
# throwaway age key, decrypt, unpack, and verify the copy against the live
# database it came from. (A full restore drill needs a second project; see
# docs/backup-restore.md.)
set -euo pipefail

: "${RUNNER_TEMP:=$(mktemp -d)}"
command -v age > /dev/null || sudo apt-get install -y -q age > /dev/null

key="$RUNNER_TEMP/backup-test.key"
age-keygen -o "$key" 2> /dev/null
BACKUP_AGE_RECIPIENT=$(age-keygen -y "$key")
export BACKUP_AGE_RECIPIENT
export BACKUP_OUT_DIR="$RUNNER_TEMP/backup-out"
unset BACKUP_S3_BUCKET

node scripts/ci/storage-probe.mjs put
bash scripts/backup/run.sh

archive=$(ls "$BACKUP_OUT_DIR"/*.tar.gz.age)
age -d -i "$key" -o "$RUNNER_TEMP/backup.tar.gz" "$archive"
mkdir -p "$RUNNER_TEMP/restored"
tar -xzf "$RUNNER_TEMP/backup.tar.gz" -C "$RUNNER_TEMP/restored"
folder=$(ls -d "$RUNNER_TEMP"/restored/green-o-*/)

for file in roles.sql schema.sql data.sql manifest.json storage/storage-manifest.json; do
  [[ -s "$folder/$file" ]] || { echo "Missing or empty: $file"; exit 1; }
done
grep -q 'COPY "public"."departments"\|COPY public.departments' "$folder/data.sql" \
  || { echo "data.sql has no departments"; exit 1; }
grep -q 'COPY "auth"."users"\|COPY auth.users' "$folder/data.sql" \
  || { echo "data.sql has no login accounts"; exit 1; }

grep -q "\"path\": \"ci/round-trip.png\"" "$folder/storage/storage-manifest.json" \
  || { echo "The Storage copy is missing the probe image"; exit 1; }

node scripts/backup/verify-restore.mts "$folder" --same-project
node scripts/ci/storage-probe.mjs remove
rm -rf "$RUNNER_TEMP/restored" "$RUNNER_TEMP/backup.tar.gz" "$BACKUP_OUT_DIR" "$key"
echo "Backup round trip passed."
