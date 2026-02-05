# Supabase migration helpers

This folder contains an initial migration and helper scripts to apply it to your Supabase project.

Files:
- `migrations/001_init.sql` : initial schema, indexes, triggers and example RLS policies.
- `../scripts/apply-supabase-init.sh` : Bash script that attempts to apply the SQL using either the `supabase` CLI or `psql`. Requires `SUPABASE_DB_URL` env var.
- `../scripts/apply-supabase-init.ps1` : PowerShell equivalent for Windows environments.

How to run (recommended):

1) Get the Postgres connection string from Supabase Dashboard → Settings → Database → Connection string (use the full URL, e.g. `postgres://postgres:password@host:6543/postgres`).

2) Run the script from project root:

Bash (Linux / macOS / Git Bash / WSL):

```bash
export SUPABASE_DB_URL="postgres://postgres:password@host:6543/postgres"
./scripts/apply-supabase-init.sh
```

PowerShell (Windows cmd / PowerShell):

```powershell
$env:SUPABASE_DB_URL = 'postgres://postgres:password@host:6543/postgres'
./scripts/apply-supabase-init.ps1
```

If you don't want to use the scripts, you can copy the SQL file and paste it into the Supabase SQL Editor (Dashboard → SQL) and run the statements there.

Notes:
- The migration includes example RLS policies which should be reviewed and hardened for production.
- Storage: If you use the `SchoolPhotos` feature, create a Supabase Storage bucket named `school-photos` (Dashboard → Storage → New bucket). Decide whether it should be public (for direct public URLs) or private (use signed URLs). The migration file also creates the `school_photos` table to store metadata — ensure it exists after running the SQL.
- For CI automation, store the DB connection string as a secret in your CI system and run the script as part of a deployment pipeline.
- Prefer running migrations in a staging environment first.

## Checklist & next steps

See `../CHECKLIST.md` for an **ultra-complete** step-by-step TODO list covering:
- Applying migrations in staging and validating RLS
- Securing Netlify env vars and service role keys
- Testing end-to-end flows (QR generation, scan logging, revocation)
- PWA offline/outbox behavior and tests

Make sure to create one GitHub issue per major section in `CHECKLIST.md` and run all items in staging before promoting to production.
