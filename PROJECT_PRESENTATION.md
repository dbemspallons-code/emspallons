# Presentation du projet Bus Management

Ce document donne une vue d'ensemble claire du projet et de son deploiement.

## Objectif

Application PWA pour la gestion du transport scolaire:
- inscription et gestion des abonnes
- paiements
- QR codes et scan
- historiques et rapports

## Stack technique

- Frontend: React + Vite + PWA (`web-pwa/`)
- Backend: Netlify Functions (`netlify/functions/`)
- Base de donnees: Supabase (PostgreSQL + RLS)
- Notifications: WhatsApp (Twilio optionnel)

## Architecture cible

- Le front consomme Supabase (anon key) et des fonctions Netlify pour les operations sensibles.
- Les migrations SQL sont dans `supabase/migrations/001_init.sql`.
- Le deploiement est gere via Netlify (build + functions).

## Documents de reference

- Quickstart local: `QUICK_START.md`
- Quickstart deploiement: `QUICKSTART_NETLIFY_SUPABASE.md`
- Guide complet: `DEPLOYMENT_NETLIFY_SUPABASE.md`
- Audit: `AUDIT_FULL.md`
