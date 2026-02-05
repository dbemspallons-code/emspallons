# Audit complet du depot

Date: 2026-02-05

Objectif: etat technique complet pour deploiement Netlify + Supabase, avec corrections prioritaires.

## 1. Synthese

Le front tourne sur `web-pwa` (Vite/React). Supabase est integre, mais des restes Firebase subsistent dans le code et la documentation. Les Netlify Functions existent mais utilisent la cle `SUPABASE_SERVICE_KEY` sans authentification, ce qui est un risque important.

## 2. Risques critiques (a traiter en priorite)

1. **Endpoints publics avec cle service role**
   - Les fonctions `log-scan`, `lock-scan`, `generate-qr-token`, `verify-qr-token`, `get-scan-logs` utilisent `SUPABASE_SERVICE_KEY`.
   - Sans auth, n'importe qui peut ecrire/lire des donnees privilegiees.
   - Correction: ajouter authentification (JWT Supabase, secret partage, Netlify Identity) ou basculer vers RLS + anon key.

2. **Policies RLS incoherentes**
   - Exemple: `reminders_config_manage_admin` verifie `auth.role() = 'admin'` (role inexistant par defaut).
   - Correction: utiliser un claim custom, ex: `(auth.jwt() ->> 'role') = 'admin'`.

3. **Melange de runtimes Netlify Functions**
   - `export default (Request/Response)` et `exports.handler` coexistent.
   - Correction: standardiser sur un format unique pour fiabilite.

## 3. Points techniques importants

- **Dependances des functions**: ajout de `netlify/functions/package.json` requis pour installer `@supabase/supabase-js`.
- **Package racine**: `package.json` racine ne contient que `@tailwindcss/postcss`. A confirmer si utile ou a supprimer.
- **Services Firebase residuels**:
  - `web-pwa/src/services/firestoreSyncService.js` importe `firebase/firestore` (risque runtime si jamais appele).
  - Dossiers `web-pwa/src/dataconnect-generated/*` references Firebase.
  - Plusieurs components utilisent encore des termes Firestore dans les textes UI.

## 4. Documentation

- Plusieurs guides historiques Firebase existent encore. Ils sont desormais **legacy**.
- Les guides a conserver comme reference:
  - `README.md`
  - `QUICK_START.md`
  - `QUICKSTART_NETLIFY_SUPABASE.md`
  - `DEPLOYMENT_NETLIFY_SUPABASE.md`
  - `CHECKLIST.md`

## 5. Tests et qualite

- Pas de pipeline de tests automatise en execution actuelle.
- Des tests Playwright existent dans `tests/` mais ne sont pas executes.
- Action: definir un minimum de tests E2E pour flux critiques (scan, paiement, sync offline).

## 6. Actions recommandees (ordre)

1. **Securite functions**: auth obligatoire ou passage a RLS stricte + anon key.
2. **RLS**: corriger les policies incoherentes et tester en SQL Editor.
3. **Netlify functions runtime**: standardiser le format.
4. **Nettoyage Firebase**: supprimer ou isoler les services Firestore residuels.
5. **Tests**: activer Playwright en CI.

## 7. Etat de preparation pour deploiement

- Build front OK.
- Netlify config OK (`netlify.toml`).
- Migration Supabase disponible.
- Points de securite a corriger avant production.
