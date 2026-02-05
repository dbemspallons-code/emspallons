# Quickstart deploiement Netlify + Supabase

Objectif: mettre en ligne rapidement en suivant les etapes minimales.

## 1. Creer le projet Supabase

- Creer un projet Supabase.
- Recuperer `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` (service_role).

## 2. Appliquer la migration SQL

Option A (script fourni):
```bash
# PowerShell
$env:SUPABASE_DB_URL='postgres://...'
./scripts/apply-supabase-init.ps1

# Bash
export SUPABASE_DB_URL='postgres://...'
./scripts/apply-supabase-init.sh
```

Option B: coller `supabase/migrations/001_init.sql` dans Supabase SQL Editor.

## 3. Configurer Netlify

Dans Netlify > Site settings > Environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `QR_TOKEN_SECRET`
- `SCHEDULED_JOB_SECRET` (si cron)
- `TWILIO_*` (optionnel)

## 4. Deployer

- Connecter le depot Git a Netlify
- Build command: `cd web-pwa && npm run build`
- Publish directory: `web-pwa/dist`
- Functions directory: `netlify/functions`

## 5. Verifier

- Page charge correctement
- Functions repondent (`/.netlify/functions/log-scan`)
- Supabase recoit les donnees

Pour un guide complet: `DEPLOYMENT_NETLIFY_SUPABASE.md`.
