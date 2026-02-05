# Audit Netlify + Supabase (deploiement)

Date: 2026-02-05

## Resume

Le socle Supabase + Netlify est en place, mais il reste des points critiques de securite et de coherences a corriger avant une mise en production.

## Points critiques

1. **Functions avec `SUPABASE_SERVICE_KEY` sans protection**
   - Les endpoints `log-scan`, `lock-scan`, `generate-qr-token`, `verify-qr-token`, `get-scan-logs` utilisent la cle service role.
   - Sans mecanisme d'auth ou secret, ces endpoints peuvent etre appeles publiquement.
   - Action: ajouter une authentification (JWT Supabase, secret partage, Netlify Identity) ou migrer les appels vers le client + RLS stricte.

2. **Melange de runtimes de fonctions**
   - Certaines fonctions utilisent `export default (Request/Response)`, d'autres `exports.handler`.
   - Action: standardiser sur un seul format (recommande: `exports.handler`) pour eviter des surprises runtime.

3. **Policies RLS incompletes / incoherentes**
   - Exemple: `reminders_config_manage_admin` utilise `auth.role() = 'admin'` (role inexistant par defaut).
   - Action: remplacer par une verification de claim (ex: `auth.jwt() ->> 'role'`).

## Points importants

- `netlify/functions/package.json` etait absent: ajoute pour installer `@supabase/supabase-js`.
- `netlify.toml` reference bien `functions = "netlify/functions"`.
- Variables d'environnement a verifier (Netlify):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY`
  - `QR_TOKEN_SECRET`
  - `SCHEDULED_JOB_SECRET` (si cron)
  - `TWILIO_*` (optionnel)

## Recommandations rapides

1. Definir un mode d'auth unique pour les fonctions.
2. Fixer les policies RLS et tester dans Supabase SQL Editor.
3. Tester toutes les fonctions en staging avant production.
