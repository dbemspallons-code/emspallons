# Reinitialisation des comptes et catalogue d'erreurs

## Objectif
Ce document explique comment reinitialiser les comptes pour recreer le premier administrateur, puis liste les erreurs courantes de la plateforme avec leur cause et la solution.

## Reinitialiser pour recreer le premier administrateur

### Quand utiliser cette procedure
- Vous voulez revoir le premier ecran "Configuration initiale".
- Vous voulez repartir de zero pour le compte admin principal.

### Ce que verifie l'application
L'ecran "Configuration initiale" apparait uniquement quand la table `public.educators` est vide.

### Etapes (Supabase)
1. Sauvegarde (optionnel mais recommande): exportez la table `public.educators` si vous voulez garder une trace.
2. Supabase Auth: Tableau de bord Supabase > Authentication > Users. Supprimez tous les utilisateurs (ou au minimum ceux qui ne doivent plus exister).
3. Supabase Database: Tableau de bord Supabase > SQL Editor. Executez la requete suivante pour vider les profils applicatifs:

```sql
-- ATTENTION: supprime tous les profils applicatifs
delete from public.educators;
```

Si la suppression est bloquee par des contraintes, utilisez:

```sql
-- A utiliser seulement si necessaire
truncate table public.educators cascade;
```

4. Nettoyage navigateur (optionnel): supprimez `recent_users` et `last_activity` du Local Storage pour eviter les anciens profils proposes.
5. Rechargez l'application: vous devez voir l'ecran "Configuration initiale".

### Si l'ecran "Configuration initiale" n'apparait pas
- La table `public.educators` n'est pas vide.
- Un profil admin est encore present.
- Vous utilisez un cache local (faites un hard refresh ou videz le local storage).

## Erreurs courantes (message -> cause -> solution)

| Message affiche | Cause probable | Solution rapide |
| --- | --- | --- |
| `Le nom est requis` | Champ nom vide lors de la creation admin | Renseigner le nom complet |
| `Un email valide est requis` | Email vide ou sans `@` | Saisir un email valide |
| `Le mot de passe doit contenir au moins 6 caracteres` | Mot de passe trop court | Utiliser 6 caracteres minimum |
| `Les mots de passe ne correspondent pas` | Confirmation differente | Retaper le meme mot de passe |
| `Le systeme a deja ete initialise` | La table `educators` contient au moins un profil | Supprimer tous les profils `educators` |
| `Cet email est deja utilise` | Email deja present dans Supabase Auth ou `educators` | Utiliser un autre email ou supprimer l'ancien compte |
| `Email ou mot de passe incorrect` | Identifiants invalides | Verifier email/mot de passe |
| `Compte utilisateur introuvable dans Supabase` | User Auth existe mais pas de profil `educators` | Recreer le profil ou supprimer le user Auth |
| `Vous devez etre connecte pour modifier votre mot de passe` | Session expiree ou non connecte | Reconnecter puis reessayer |
| `Mot de passe actuel incorrect` | Mauvais mot de passe actuel | Retaper le bon mot de passe |
| `Seuls les administrateurs peuvent modifier les parametres` | Compte educateur tente une action admin | Se connecter avec un admin |
| `Impossible de supprimer le dernier compte administrateur.` | Tentative de suppression du seul admin | Creer un autre admin avant suppression |
| `Impossible de retirer le seul compte administrateur.` | Tentative de retrograder le seul admin | Promouvoir un autre admin avant retrogradation |
| `Le nom du controleur est requis` | Creation/modif controleur sans nom | Renseigner le nom du controleur |
| `Ce code est deja utilise par un autre controleur` | Code controleur duplique | Choisir un autre code |
| `Code invalide. Contactez l'administration.` | QR/Code controleur incorrect | Verifier le code scanne |
| `Ce controleur est inactif. Contactez l'administration.` | Controleur desactive | Reactiver le controleur |
| `Nombre de mois invalide` | Valeur hors liste autorisee | Utiliser 1, 2, 3, 5, 6 ou 12 |
| `Le montant mensuel doit etre superieur a 0` | Montant 0 ou negatif | Saisir un montant > 0 |
| `Contact etudiant manquant` | Numero WhatsApp absent | Ajouter le numero dans la fiche etudiant |
| `Erreur envoi WhatsApp` | Probleme reseau ou configuration | Reessayer, verifier la connexion |

## Verification rapide apres reinitialisation
1. Ouvrir l'application
2. L'ecran "Configuration initiale" doit apparaitre
3. Creer le premier admin
4. Se connecter

---
Si tu veux, je peux aussi generer une version PDF de ce document.
