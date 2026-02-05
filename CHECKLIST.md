# Checklist deploiement (Netlify + Supabase)

Date: 2026-02-05

## Avant deploiement

- [ ] Variables d'environnement configurees (Netlify)
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY`
  - `QR_TOKEN_SECRET`
  - `SCHEDULED_JOB_SECRET` (si cron)
  - `TWILIO_*` / `SMTP_*` (si utilise)

- [ ] Migration Supabase appliquee (`supabase/migrations/001_init.sql`)
- [ ] Policies RLS verifiees et adaptees aux roles
- [ ] Fonctions Netlify testees en local (`netlify dev`)

## Deploiement

- [ ] Build OK (`npm run build` dans `web-pwa`)
- [ ] Netlify deploy OK (via Git ou CLI)
- [ ] Fonctions accessibles:
  - `/.netlify/functions/log-scan`
  - `/.netlify/functions/verify-qr-token`
  - `/.netlify/functions/reset-scan-logs` (admin)

## Post-deploiement

- [ ] Test complet du flux:
  - creation abonne
  - generation QR
  - scan + log
- [ ] Logs Netlify et Supabase OK
- [ ] Sauvegardes / monitoring configurees
