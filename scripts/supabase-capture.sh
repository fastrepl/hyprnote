#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(dirname "$SCRIPT_DIR")
cd "$ROOT_DIR"

generated_env_file=".supabase/generated.env"
output_file=$(mktemp)
cleanup() {
  rm -f "$output_file"
}
trap cleanup EXIT

mkdir -p "$(dirname "$generated_env_file")"

set +e
supabase start 2>&1 | tee "$output_file"
EXIT_CODE=${PIPESTATUS[0]}
set -e

if [ "$EXIT_CODE" -ne 0 ]; then
  exit "$EXIT_CODE"
fi

awk '
  /API URL:/ { print "SUPABASE_URL=\"" $NF "\""; print "VITE_SUPABASE_URL=\"" $NF "\"" }
  /GraphQL URL:/ { print "SUPABASE_GRAPHQL_URL=\"" $NF "\""; print "VITE_SUPABASE_GRAPHQL_URL=\"" $NF "\"" }
  /S3 Storage URL:/ { print "SUPABASE_STORAGE_URL=\"" $NF "\""; print "VITE_SUPABASE_STORAGE_URL=\"" $NF "\"" }
  /Database URL:/ { print "DATABASE_URL=\"" $NF "\"" }
  /Studio URL:/ { print "SUPABASE_STUDIO_URL=\"" $NF "\"" }
  /Publishable key:/ { print "SUPABASE_ANON_KEY=\"" $NF "\""; print "VITE_SUPABASE_ANON_KEY=\"" $NF "\"" }
  /Secret key:/ { print "SUPABASE_SERVICE_ROLE_KEY=\"" $NF "\"" }
  /S3 Access Key:/ { print "S3_ACCESS_KEY=\"" $NF "\"" }
  /S3 Secret Key:/ { print "S3_SECRET_KEY=\"" $NF "\"" }
  /S3 Region:/ { print "S3_REGION=\"" $NF "\"" }
' "$output_file" > "$generated_env_file"
