# Resume du projet Bus Management

Objectif: gerer les abonnes au transport scolaire, les paiements et le controle d'acces par QR code.

## Qui peut faire quoi

- **Admin / Educatrice**
  - creer, modifier, supprimer des abonnes
  - enregistrer des paiements
  - generer et revoquer des QR codes
  - consulter les historiques et rapports
  - gerer les conducteurs/controleurs
  - configurer l'application (parametres, lignes, rappels)

- **Controleur / Chauffeur**
  - se connecter avec un code
  - scanner les QR codes
  - voir le statut de validite (valide, en retard, expire)
  - enregistrer les passages (logs)

## Interfaces

- **Ecran Educatrice**
  - tableau de bord (statistiques, filtres, recherche)
  - formulaire abonne + liste + actions rapides
  - paiements et rapports mensuels

- **Ecran Chauffeur**
  - scan QR en temps reel
  - affichage immediat du statut
  - mode hors ligne (file d'attente)

## Architecture technique

- Frontend: React + Vite + PWA (`web-pwa/`)
- Backend: Netlify Functions (`netlify/functions/`)
- Base de donnees: Supabase (PostgreSQL + RLS)

## Flux principal

1. L'educatrice cree un abonne et un QR code.
2. Le chauffeur scanne le QR -> verification serveur.
3. Le scan est logge dans Supabase.

## Deploiement

Voir `DEPLOYMENT_NETLIFY_SUPABASE.md` et `QUICKSTART_NETLIFY_SUPABASE.md`.
