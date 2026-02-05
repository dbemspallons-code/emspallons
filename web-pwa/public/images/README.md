# Images pour EMSP Allons!

Ce dossier contient les images utilisées dans l'application EMSP Allons!.

## Structure des dossiers

### `/logos/`
Contient les logos de l'école et de la plateforme :

- **`emsp-logo.png`** : Logo de l'école EMSP (Ecole Multinationale Supérieure des Postes d'Abidjan)
  - Format recommandé : PNG avec fond transparent
  - Taille recommandée : 400x400px minimum
  - Description : Logo avec la carte de l'Afrique, des enveloppes, et le texte "EMSP"

- **`emsp-allons-logo.png`** : Logo de la plateforme "EMSP Allons!" (Transport Management)
  - Format recommandé : PNG avec fond transparent
  - Taille recommandée : 400x400px minimum
  - Description : Logo circulaire avec un bus, un engrenage, et le texte "EMSP TRANSPORT MANAGEMENT"

### `/students/`
Contient les images des étudiants pour les animations de fond :

- **`student-1.png`** : Image d'un étudiant (masculin)
- **`student-2.png`** : Image d'une étudiante (féminin)
- **`student-3.png`** : Image d'un étudiant (masculin)
- **`student-4.png`** : Image d'une étudiante (féminin)
- **`student-5.png`** : Image d'un étudiant (masculin)
- **`student-6.png`** : Image d'une étudiante (féminin)

**Format recommandé pour les étudiants :**
- Format : PNG avec fond transparent
- Taille recommandée : 200x200px minimum
- Les images seront affichées à 60px sur desktop et 40px sur mobile
- Les images seront animées avec des effets de flottement et de rotation

## Notes importantes

1. **Fallback automatique** : Si une image n'est pas trouvée, l'application utilisera automatiquement un fallback CSS (logo stylisé ou emoji pour les étudiants).

2. **Optimisation** : Pour de meilleures performances, optimisez vos images avant de les ajouter :
   - Utilisez des outils comme TinyPNG ou ImageOptim
   - Compressez les images sans perte de qualité visible
   - Utilisez le format PNG pour les logos avec transparence

3. **Noms de fichiers** : Respectez exactement les noms de fichiers indiqués ci-dessus, car ils sont référencés dans le code.

## Emplacement des fichiers

Placez vos images dans les dossiers suivants :

```
web-pwa/public/images/
├── logos/
│   ├── emsp-logo.png
│   └── emsp-allons-logo.png
└── students/
    ├── student-1.png
    ├── student-2.png
    ├── student-3.png
    ├── student-4.png
    ├── student-5.png
    └── student-6.png
```

Une fois les images ajoutées, elles seront automatiquement utilisées dans l'application avec les animations configurées.

