# Bus Management (Netlify + Supabase)

Projet de gestion du transport scolaire avec PWA, scan QR et back-end Supabase.

**Statut (2026-02-05)**: migration Firebase -> Supabase en cours, objectif: deploiement stable sur Netlify.

## Demarrage rapide (local)

1. Installer les dependances front:
```bash
cd web-pwa
npm install
```

2. Configurer l'environnement:
```bash
copy ..\.env.example .env.local
```
Puis renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `web-pwa/.env.local`.

3. Lancer l'application:
```bash
cd web-pwa
npm run dev
```
Ouvrir `http://localhost:5173`.

## Deploiement Netlify + Supabase

- Guide rapide: `QUICKSTART_NETLIFY_SUPABASE.md`
- Guide complet: `DEPLOYMENT_NETLIFY_SUPABASE.md`
- Checklist: `CHECKLIST.md`
- Audit: `AUDIT_FULL.md`

## Notes importantes

- Les anciens guides Firebase sont consideres comme **legacy**. Le flux actuel utilise Supabase.
- Les Netlify Functions sont dans `netlify/functions`.
- Les migrations Supabase sont dans `supabase/migrations/001_init.sql`.

## Stack

React + Vite, Supabase (PostgreSQL + Auth), Netlify Functions, PWA.
