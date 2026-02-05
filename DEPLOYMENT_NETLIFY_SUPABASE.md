# Deploiement Netlify + Supabase (guide complet)

Date: 2026-02-05

Ce guide est la reference officielle pour deployer le projet sur Netlify avec Supabase.

## 1. Pre-requis

- Node.js 18+ (22 OK)
- Compte Netlify + Compte Supabase
- Netlify CLI (optionnel)
- Supabase CLI (optionnel)

## 2. Architecture

- Frontend PWA: `web-pwa/` (Vite + React)
- Netlify Functions: `netlify/functions/`
- Migrations SQL: `supabase/migrations/001_init.sql`
- Config Netlify: `netlify.toml` (a la racine)

## 3. Variables d'environnement

### Netlify (production)

Configurer dans Netlify > Site settings > Environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `QR_TOKEN_SECRET`
- `SCHEDULED_JOB_SECRET` (si jobs planifies)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (optionnel)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (optionnel)

### Local (dev)

Copier `.env.example` -> `web-pwa/.env.local` et remplir les cles.

## 4. Base de donnees Supabase

### 4.1 Appliquer la migration

Option A (script):
```bash
# PowerShell
$env:SUPABASE_DB_URL='postgres://...'
./scripts/apply-supabase-init.ps1

# Bash
export SUPABASE_DB_URL='postgres://...'
./scripts/apply-supabase-init.sh
```

Option B: coller le contenu de `supabase/migrations/001_init.sql` dans Supabase SQL Editor.

### 4.2 RLS (Row Level Security)

Le fichier `supabase/migrations/001_init.sql` active RLS et fournit des policies d'exemple.
Il faut **verifier et adapter** ces policies selon vos roles/claims.

## 5. Netlify Functions

Les fonctions utilisent `@supabase/supabase-js`. Un `package.json` existe dans `netlify/functions`.

Installation locale:
```bash
cd netlify/functions
npm install
```

## 6. Build & Deploiement

### 6.1 Via Netlify (recommande)

Dans le site Netlify:

- Build command: `cd web-pwa && npm run build`
- Publish directory: `web-pwa/dist`
- Functions directory: `netlify/functions`

Netlify lira `netlify.toml` a la racine.

### 6.2 Via CLI (optionnel)

```bash
npx netlify deploy --prod --dir=web-pwa/dist --site=$NETLIFY_SITE_ID
```

## 7. Verification post-deploiement

- Frontend charge sans erreur.
- Netlify Functions repondent:
  - `/.netlify/functions/log-scan`
  - `/.netlify/functions/verify-qr-token`
- Supabase recoit les donnees (tables `scan_logs`, `payments`, etc.)

## 8. Points de securite (a confirmer)

- Les fonctions server utilisent `SUPABASE_SERVICE_KEY` (privilegie). Verifier l'acces (auth ou secret) avant production.
- Les policies RLS doivent etre testees avec des comptes reels.
- Ne jamais exposer `SUPABASE_SERVICE_KEY` dans le front.

## 9. Liens utiles

- Quickstart: `QUICKSTART_NETLIFY_SUPABASE.md`
- Checklist: `CHECKLIST.md`
- Audit complet: `AUDIT_FULL.md`
