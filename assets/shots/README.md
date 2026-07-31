# Captures d'écran des projets

Un dossier par projet. Les fichiers sont numérotés `01`, `02`, `03`… et
c'est **cet ordre qui fait l'ordre de défilement** dans la galerie.

```
assets/shots/
├── dossiers-judiciaires/   01.webp  02.webp  03.webp
├── thies-ville/            01.webp  02.webp
├── tontine-app/            01.webp  02.webp
├── insertion-pro/          01.webp  02.webp
├── infra-server/           01.webp
└── stock-model/            01.webp
```

## Format

| Réglage | Valeur |
|---|---|
| Format | WebP |
| Largeur | 1280 px |
| Ratio | 16/10 (soit 1280 × 800) |
| Qualité | 80 |
| Poids visé | 60 à 120 Ko par image |

Le cadre de la galerie est en 16/10 et les images sont en `object-fit:cover`.
Une capture d'un autre ratio ne cassera rien, elle sera simplement recadrée
au centre — mais viser 1280 × 800 évite les mauvaises surprises.

Convertir depuis un PNG :

```bash
cwebp -q 80 -resize 1280 0 capture.png -o 01.webp
```

## Rien n'est obligatoire

Le site fonctionne sans aucune de ces images : chaque carte affiche alors un
cadre en pointillés et la mention « captures à venir ». `js/gallery.js` sonde
chaque fichier avant de l'afficher et ne garde que ceux réellement présents.
Vous pouvez donc déposer les captures au fil de l'eau, une par une.

## Ajouter ou retirer une capture

Deux endroits à mettre à jour, **dans le même ordre** :

1. `index.html` — les attributs `data-shots` (chemins) et `data-alts`
   (descriptions françaises) de la `<figure class="project-gallery">` du projet.
2. `i18n/fr.json` et `i18n/en.json` — les clés `shots.<projet>.<n>`.

La description alternative n'est pas facultative : une capture sans `alt` est
une image vide pour un lecteur d'écran. Décrivez ce que la capture **montre**
(« Tableau de bord des dossiers en cours »), pas ce qu'elle est
(« capture 1 »).
