# 📋 Règles de Gestion - Système de Contrôle de Car EMSP

## 🔐 Gestion des Mots de Passe

### ✅ Règles Implémentées

1. **Modification de mot de passe par éducatrice**
   - ✅ Les éducatrices peuvent modifier leur propre mot de passe
   - ✅ L'admin peut modifier son propre mot de passe
   - ✅ Nécessite le mot de passe actuel pour validation
   - ✅ Minimum 6 caractères requis
   - ✅ Confirmation du nouveau mot de passe obligatoire

2. **Réinitialisation de mot de passe par admin**
   - ✅ L'admin peut réinitialiser le mot de passe de n'importe quelle éducatrice
   - ✅ L'admin peut réinitialiser son propre mot de passe (via modification)
   - ✅ Utilise l'Admin SDK Firebase pour la réinitialisation
   - ✅ Enregistrement de l'action dans l'historique des activités

## 👥 Gestion des Utilisateurs

### ✅ Règles Implémentées

1. **Création d'utilisateurs**
   - ✅ Seul l'admin peut créer de nouveaux utilisateurs
   - ✅ Un seul compte admin peut exister à la fois
   - ✅ Validation de l'email (format et unicité)
   - ✅ Mot de passe minimum 6 caractères

2. **Modification d'utilisateurs**
   - ✅ L'admin peut modifier tous les utilisateurs
   - ✅ Un utilisateur ne peut pas modifier son propre compte (via UserManager)
   - ✅ Modification du rôle possible (avec restrictions)
   - ✅ Modification du nom possible

3. **Suppression d'utilisateurs**
   - ✅ L'admin peut supprimer des éducatrices
   - ✅ Impossible de supprimer le seul compte admin
   - ✅ Impossible de supprimer son propre compte

## 🚌 Gestion des Lignes

### ✅ Règles Implémentées

1. **CRUD des lignes**
   - ✅ Création, modification, suppression de lignes
   - ✅ 3 lignes initiales : Yopougon, Angre/Bingerville, Abobo
   - ✅ Gestion via modal `LineManager`

2. **Attribution aux étudiants**
   - ✅ Ligne obligatoire lors de l'inscription
   - ✅ Modification possible par l'admin
   - ✅ Filtrage par ligne disponible

## 👮 Gestion des Contrôleurs

### ✅ Règles Implémentées

1. **Création et gestion**
   - ✅ Création de contrôleurs avec code d'accès unique
   - ✅ Attribution d'une ligne spécifique (obligatoire)
   - ✅ Activation/désactivation possible

2. **Contrôle d'accès au scan**
   - ✅ Un contrôleur ne peut scanner QUE les abonnés de sa ligne
   - ✅ Message d'erreur explicite si scan d'un abonné d'une autre ligne
   - ✅ Authentification par code fourni par l'éducatrice

## 📚 Gestion des Classes et Promos

### ✅ Règles Implémentées

1. **CRUD des classes et promos**
   - ✅ Création, modification, suppression par l'admin
   - ✅ Promos par défaut : Licence 1, Licence 2, Licence 3, Master 1, Master 2
   - ✅ Listes déroulantes dynamiques dans le formulaire d'inscription

2. **Utilisation**
   - ✅ Sélection obligatoire lors de l'inscription
   - ✅ Filtrage possible par classe/promo

## 🎓 Gestion des Étudiants

### ✅ Règles Implémentées

1. **Inscription**
   - ✅ Nom, prénom, contact obligatoires
   - ✅ Ligne obligatoire
   - ✅ Lieu de ramassage obligatoire (modifiable après)
   - ✅ Classe et promo obligatoires (listes déroulantes)
   - ✅ Génération automatique du QR code

2. **Modification**
   - ✅ Modification possible de toutes les informations
   - ✅ Lieu de ramassage modifiable après inscription
   - ✅ Ligne modifiable par l'admin

## 💰 Gestion des Paiements

### ✅ Règles Implémentées

1. **Enregistrement de paiement**
   - ✅ Choix du nombre de mois (1, 2, 3, 5, 6, 12)
   - ✅ Calcul automatique des dates d'expiration
   - ✅ Période de grâce de 5 jours après expiration
   - ✅ Décalage automatique si mois hors service

2. **Statuts de paiement**
   - ✅ **ACTIF** : Paiement à jour
   - ✅ **EN RETARD** : Dans la période de grâce (5 jours)
   - ✅ **EXPIRÉ** : Après la période de grâce
   - ✅ **HORS SERVICE** : Pendant les mois de pause

## 🗓️ Gestion des Mois Hors Service

### ✅ Règles Implémentées

1. **Configuration**
   - ✅ Sélection multiple de mois (ex: Juillet, Août, Décembre)
   - ✅ Interface calendrier visuel
   - ✅ Gestion par l'admin uniquement

2. **Impact sur les statuts**
   - ✅ Pas d'affichage "Expiré" ou "En retard" pendant ces mois
   - ✅ Badge "Période hors service" ou "Vacances"
   - ✅ Pas de calcul de retard
   - ✅ Pas d'envoi de rappels automatiques
   - ✅ Décalage automatique des abonnements si paiement pour un mois hors service

## 🔔 Système de Rappels

### ✅ Règles Implémentées

1. **Types de rappels**
   - ✅ Proche expiration (7 jours avant - personnalisable)
   - ✅ Jour d'expiration
   - ✅ Retard de paiement (X jours après expiration - personnalisable)
   - ✅ Abonnement terminé

2. **Configuration**
   - ✅ Activation/désactivation par type
   - ✅ Délais personnalisables
   - ✅ Éditeur de templates de messages
   - ✅ Variables dynamiques : {nom}, {prenom}, {date_expiration}, {ligne}, {montant}

## 📊 Synchronisation Multi-Appareils

### ✅ Règles Implémentées

1. **Firestore comme source unique de vérité**
   - ✅ Toutes les données critiques dans Firestore
   - ✅ Synchronisation en temps réel via `onSnapshot()`
   - ✅ Modifications visibles immédiatement sur tous les appareils

2. **Collections synchronisées**
   - ✅ Utilisateurs (educators)
   - ✅ Étudiants (students)
   - ✅ Contrôleurs (controllers)
   - ✅ Lignes (lines)
   - ✅ Paiements (payments)
   - ✅ Classes (classes)
   - ✅ Promos (promos)
   - ✅ Logs de scan (scanLogs)
   - ✅ Historique système (systemHistory)
   - ✅ Paramètres globaux (settings)

## 🔒 Sécurité

### ✅ Règles Implémentées

1. **Authentification**
   - ✅ Firebase Authentication pour les éducatrices/admin
   - ✅ Authentification par code pour les contrôleurs
   - ✅ Session temporaire pour les contrôleurs (sessionStorage)

2. **Autorisations**
   - ✅ Lecture publique pour scanner (students, passes, controllers, lines)
   - ✅ Écriture réservée aux utilisateurs authentifiés
   - ✅ Admin uniquement pour certaines actions (création utilisateurs, réinitialisation mots de passe)

## 📝 Historique et Traçabilité

### ✅ Règles Implémentées

1. **Enregistrement des actions**
   - ✅ Toutes les actions importantes enregistrées dans `educatorActivityLogs`
   - ✅ Informations : qui, quoi, quand, métadonnées
   - ✅ Historique accessible par l'admin

2. **Logs de scan**
   - ✅ Enregistrement de tous les scans
   - ✅ Informations : étudiant, contrôleur, date/heure, statut
   - ✅ Protection contre les scans multiples (1 heure)

## 🎯 Règles Spécifiques par Rôle

### Admin
- ✅ Création, modification, suppression d'utilisateurs
- ✅ Réinitialisation des mots de passe
- ✅ Gestion des lignes, contrôleurs, classes, promos
- ✅ Configuration des mois hors service
- ✅ Configuration des rappels
- ✅ Accès à tous les scans et historique
- ✅ Modification de son propre mot de passe

### Éducateur
- ✅ Gestion complète des étudiants (CRUD)
- ✅ Enregistrement de paiements
- ✅ Génération et révocation de QR codes
- ✅ Modification de son propre mot de passe
- ❌ Ne peut pas créer d'utilisateurs
- ❌ Ne peut pas réinitialiser les mots de passe des autres

### Contrôleur
- ✅ Authentification par code
- ✅ Scan des QR codes des étudiants
- ✅ Accès uniquement aux étudiants de sa ligne assignée
- ❌ Pas d'accès à l'interface de gestion
- ❌ Pas d'authentification complète requise

## ✅ Toutes les Règles de Gestion Sont Appliquées

Toutes les règles de gestion demandées ont été implémentées et sont fonctionnelles dans le système.

