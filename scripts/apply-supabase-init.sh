#!/usr/bin/env bash
set -euo pipefail

# Script to apply Supabase initial migration (supabase/migrations/001_init.sql)
# Usage:
#  SUPABASE_DB_URL="postgres://postgres:password@db.host:6543/postgres" ./scripts/apply-supabase-init.sh
# or
#  export SUPABASE_DB_URL=... ; ./scripts/apply-supabase-init.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_FILE="$ROOT_DIR/supabase/migrations/001_init.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: SQL file not found at $SQL_FILE"
  exit 1
fi

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "ERROR: SUPABASE_DB_URL is not set. Get the Postgres connection string from your Supabase project (Settings → Database → Connection string)."
  echo "Example: export SUPABASE_DB_URL='postgres://postgres:password@db.host:6543/postgres'"
  exit 2
fi

# Prefer supabase CLI if available
if command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI detected. Using 'supabase db remote set' + 'supabase db query'..."
  supabase db remote set "$SUPABASE_DB_URL"
  supabase db query --file "$SQL_FILE"
  echo "Migration applied via supabase CLI."
  exit 0
fi

# Fallback to psql if available
if command -v psql >/dev/null 2>&1; then
  echo "psql detected. Applying SQL via psql..."
  psql "$SUPABASE_DB_URL" -f "$SQL_FILE"
  echo "Migration applied via psql."
  exit 0
fi

# If we reached here we cannot apply automatically
cat <<'EOF'
ERROR: Neither 'supabase' CLI nor 'psql' found in PATH. Install the supabase CLI (npm i -g supabase) or psql (Postgres client) and re-run.
Manual alternative: open the SQL in supabase/migrations/001_init.sql and paste it in Supabase SQL Editor (Dashboard → SQL).
EOF
exit 3
