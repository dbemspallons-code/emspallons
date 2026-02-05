# Tâches incomplètes et prochaines actions

Date: 2026-02-01

Résumé des éléments restants et actions prises/proposées:

1) PWA offline & sync ✅ (partiellement terminé)
   - Status: Service worker, outbox, background sync et messages SW → clients implémentés.
   - Reste à faire: Tests E2E automatisés pour valider le scénario offline → queue → sync (template fourni).
   - Plan: Je fournis des tests Playwright templates et je peux lancer une session CI pour exécuter ces tests si tu veux.

2) Automatisation WhatsApp ✅ (template, Twilio implémentation & scheduler)
   - Status: `send-whatsapp.js` (wa.me) et `send-whatsapp-twilio.js` (Twilio) ajoutés. La fonction vérifie désormais `X-SCHEDULED-SECRET` si `SCHEDULED_JOB_SECRET` est défini.
   - Reste à faire: Configurer Twilio (SID/TOKEN), approuver le sender, et définir `SCHEDULED_JOB_SECRET` dans Netlify + GitHub Secrets.
   - Plan: Un workflow GitHub Actions de cron a été ajouté (`.github/workflows/scheduled-whatsapp.yml`) qui appelle la function en production; un script local de test `scripts/test-send-whatsapp-twilio.js` a également été ajouté pour validations locales.

3) Indicateur global de file ✅
   - Status: Badges ajoutés dans `AppNew` et `Dashboard` + `ControllerScan`.
   - Reste à faire: Intégrer dans d'autres vues (si souhaité).

4) Tests E2E (template) ✅ (créés, pas exécutés)
   - Fichiers: `tests/e2e/playwright/offline.spec.js` + README avec instruction.
   - Plan: Installer Playwright en local/CI et exécuter.

5) RLS & Policies (à valider) ⚠️
   - Status: Policies exemples ajoutées dans `supabase/policies.sql` (scan_logs, qr_codes, payments minimal).
   - Reste à faire: Ajuster les policies en fonction des UIDs/claims réelles et tester en SQL editor.
   - Plan: Je peux préparer un ensemble de tests SQL à exécuter sur ton instance Supabase pour valider chaque policy.

6) Audit dépendances & sécurité
   - Status: `AUDIT_NETLIFY_SUPABASE.md` créé (liste d'actions et points à vérifier).
   - Reste à faire: Lancer `npm audit` sur une machine avec réseau stable et corriger vulnérabilités.

---

Dis-moi si tu veux que je :
- Exécute les tests E2E (je peux configurer GitHub Actions / Netlify CI pour ça), ou
- Déploie le job d'envoi WhatsApp automatique (cron / Supabase scheduled job), ou
- Prépare un script pour tester automatiquement tes policies RLS sur ta instance Supabase.

Je peux commencer par l'option que tu choisis et continuer dans l'ordre indiqué.