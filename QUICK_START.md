# Guide de demarrage rapide (local)

Objectif: lancer l'application en local en moins de 5 minutes.

## 1. Installation

```bash
cd web-pwa
npm install
```

## 2. Configuration

Copier le fichier d'exemple et remplir les valeurs Supabase:

```bash
copy ..\\.env.example .env.local
```

Completer `web-pwa/.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 3. Lancer l'app

```bash
cd web-pwa
npm run dev
```

Ouvrir `http://localhost:5173`.

## 4. Points de verif rapides

- L'ecran principal se charge sans erreur.
- Les listes se chargent (donnees Supabase).
- Le scan QR fonctionne (camera + lecture).

## Docs utiles

- Deploiement rapide: `QUICKSTART_NETLIFY_SUPABASE.md`
- Deploiement complet: `DEPLOYMENT_NETLIFY_SUPABASE.md`
- Audit: `AUDIT_FULL.md`
