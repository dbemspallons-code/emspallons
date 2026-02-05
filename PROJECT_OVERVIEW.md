# Bus Management - Presentation du projet

But: application de gestion des abonnements et du controle d'acces des eleves pour le transport scolaire.

## Fonctionnalites principales

- Gestion des abonnes/eleves (CRUD)
- Paiements et facturation
- QR codes (generation + verification)
- Scan mobile et logs offline (PWA + outbox)
- Relances (WhatsApp / Email)
- Audit et tracabilite

## Architecture

- Frontend: React + Vite + PWA (`web-pwa/`)
- Server-side: Netlify Functions (`netlify/functions/`)
- DB: Supabase (PostgreSQL + RLS)

## Etat actuel

- Migration vers Supabase en cours.
- Certaines parties utilisent encore des anciens services Firebase (voir `AUDIT_FULL.md`).
- Deploiement cible: Netlify + Supabase.

## Documents de reference

- `DEPLOYMENT_NETLIFY_SUPABASE.md`
- `QUICKSTART_NETLIFY_SUPABASE.md`
- `CHECKLIST.md`
