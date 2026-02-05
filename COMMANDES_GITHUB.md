# 🔄 Commandes GitHub - Guide Rapide

## ⚡ Synchronisation Rapide (Une Commande)

### Option 1 : Script Automatique
```bash
cd "/media/ubuntu/Nouveau nom/PROJET/bus-management-complete"
bash sync-github-simple.sh
```

### Option 2 : Commandes Manuelles
```bash
cd "/media/ubuntu/Nouveau nom/PROJET/bus-management-complete"
git add .
git commit -m "Mise à jour : Nouvelles fonctionnalités et améliorations"
git push origin main
```

---

## 📋 Dépôt GitHub Configuré

**Remote actuel :** `https://github.com/abdoulrhamaneivo-ctrl/Carmanagement.git`

**Branche :** `main`

---

## 🔐 Authentification GitHub

### Si vous êtes invité à vous authentifier :

**Option 1 : Token Personnel (Recommandé)**
1. Créer un token : https://github.com/settings/tokens
2. Générer un nouveau token (classic) avec permission `repo`
3. Utiliser le token comme mot de passe lors du push

**Option 2 : SSH**
1. Configurer SSH (voir INSTRUCTIONS_GITHUB.md)
2. Changer l'URL : `git remote set-url origin git@github.com:abdoulrhamaneivo-ctrl/Carmanagement.git`

---

## 📝 Commandes Utiles

### Voir les fichiers modifiés
```bash
git status
```

### Voir les différences
```bash
git diff
```

### Voir l'historique
```bash
git log --oneline -10
```

### Vérifier le remote
```bash
git remote -v
```

### Récupérer les changements distants
```bash
git pull origin main
```

---

## ✅ Checklist

- [ ] Git installé (`git --version`)
- [ ] Git configuré (nom et email)
- [ ] Authentification GitHub configurée
- [ ] Fichiers ajoutés (`git add .`)
- [ ] Commit créé
- [ ] Push réussi

---

*Guide rapide - Dépôt : abdoulrhamaneivo-ctrl/Carmanagement*

