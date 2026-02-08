# EMSP Allons! - Back-office (Bus Management)

## Résumé
Plateforme web de gestion du transport scolaire (inscriptions, abonnements, paiements, QR codes, contrôleurs, rappels WhatsApp, export/import). Le cœur applicatif est dans `web-pwa`, les fonctions serveur dans `netlify/functions`, et la base gérée par Supabase (migrations SQL).

## Dossiers principaux
- `web-pwa/` : application React (UI, logique métier, services).
- `netlify/functions/` : fonctions Netlify (création d’utilisateurs, logs, QR, scans).
- `supabase/migrations/` : scripts SQL (tables, RLS, triggers, vues).
- `docs/` : guides d’utilisation et dossier technique.
- `archive/` : archives et exports historiques.

## Prérequis
- Node.js (voir `.nvmrc`).
- npm.

## Installation locale
```bash
cd web-pwa
npm install
npm run dev
```

## Variables d’environnement
### Frontend (Netlify ou `.env` local)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Netlify Functions (Netlify → Environment variables)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Notes
- Les fonctions exigent la clé *service role* côté serveur (ne jamais l’exposer côté client).
- Les erreurs “Missing Supabase service configuration” viennent souvent d’une variable manquante côté Netlify.

## Supabase (migrations)
Ordre conseillé (fichiers dans `supabase/migrations/`) :
- `006_subscribers_rls_policies.sql`
- `007_educators_table_and_policies.sql`
- `008_auth_users_trigger.sql`
- `009_payments_rls_policies.sql`
- `010_system_history_rls.sql`

Conseil
- Exécuter les migrations dans le SQL Editor Supabase.
- Les scripts sont “safe to run multiple times”.

## Fonctions Netlify (API serveur)
Fonctions clés
- `admin-create-user.js` : création d’utilisateurs (admin).
- `admin-reset-password.js` : réinitialisation mot de passe.
- `generate-qr-token.js`, `verify-qr-token.js` : QR.
- `log-scan.js`, `get-scan-logs.js`, `lock-scan.js` : scans.

Sécurité
- Les fonctions vérifient un token et utilisent la clé service role côté serveur.

## Déploiement Netlify
Option UI
- Pousser sur GitHub et laisser Netlify déployer.

Option CLI
```bash
npm run build
netlify deploy --prod
```

## Dépannage rapide
- Écran blanc ou page vide : vérifier console du navigateur, erreurs JS, variables `VITE_SUPABASE_*`.
- Erreur RLS lors d’un ajout étudiant : vérifier policies `subscribers`.
- Utilisateur créé mais absent dans la table : vérifier trigger `008_auth_users_trigger.sql`.
- Textes bizarres (Ã©, Ã¨) : vérifier encodage UTF‑8 et `_headers`.

## Documentation
- Guide d’utilisation : `docs/GUIDE_UTILISATION_PLATEFORME.md`
- Dossier technique & sécurité : `docs/DOSSIER_TECHNIQUE_SECURITE.md`
- Réinitialisation admin : `docs/GUIDE_REINITIALISATION_ADMIN_ET_ERREURS.pdf`

## Où chercher selon le problème
- UI/UX : `web-pwa/src/components/`
- Logique métier : `web-pwa/src/services/`
- Export/Import : `web-pwa/src/services/exportService.js`
- Auth & utilisateurs : `web-pwa/src/services/authService.js` et `netlify/functions/admin-create-user.js`
- Base & sécurité : `supabase/migrations/`
