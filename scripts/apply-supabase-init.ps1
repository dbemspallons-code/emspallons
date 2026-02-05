<#
.SYNOPSIS
  Apply Supabase initial SQL migration (supabase/migrations/001_init.sql)
.EXAMPLE
  $env:SUPABASE_DB_URL = "postgres://postgres:password@db.host:6543/postgres"
  ./scripts/apply-supabase-init.ps1
#>

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$sqlFile = Join-Path $root 'supabase\migrations\001_init.sql'

if (-not (Test-Path $sqlFile)) {
  Write-Error "SQL file not found at $sqlFile"
  exit 1
}

if (-not $Env:SUPABASE_DB_URL) {
  Write-Error "SUPABASE_DB_URL not set. Get it from Supabase Dashboard → Settings → Database → Connection string"
  exit 2
}

if (Get-Command supabase -ErrorAction SilentlyContinue) {
  Write-Host "supabase CLI detected. Using 'supabase db remote set' + 'supabase db query'..."
  supabase db remote set $Env:SUPABASE_DB_URL
  supabase db query --file $sqlFile
  Write-Host "Migration applied via supabase CLI."
  exit 0
}

if (Get-Command psql -ErrorAction SilentlyContinue) {
  Write-Host "psql detected. Applying SQL via psql..."
  psql $Env:SUPABASE_DB_URL -f $sqlFile
  Write-Host "Migration applied via psql."
  exit 0
}

Write-Error "Neither 'supabase' CLI nor 'psql' were found. Install the supabase CLI (npm i -g supabase) or Postgres client (psql) and re-run. Alternatively, paste the SQL manually into Supabase SQL editor."
exit 3
