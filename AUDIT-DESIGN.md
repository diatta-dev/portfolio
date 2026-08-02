# AUDIT-DESIGN : portfolio Elhadji Diatta

État du chantier de design et d'architecture front. Ce document tient le
registre de ce qui a été fait, de ce qui reste, et **pourquoi** chaque
arbitrage a été tranché dans ce sens : c'est la partie qui se perd le plus
vite et qui coûte le plus cher à retrouver.

Dernière mise à jour : 31 juillet 2026.

> **Note sur la numérotation.** Ce fichier a été (re)constitué à partir du
> cahier des charges des trois fonctionnalités A/B/C, qui renvoie à des
> points d'audit numérotés (1, 2, 3, 6, 12) dont l'énoncé d'origine n'était
> pas disponible. Les points 1, 2, 3, 6 et 12 ci-dessous ont été reconstruits
> à partir du contexte donné dans ce cahier des charges et de l'état réel du
> code. Les autres numéros sont laissés libres : si l'audit d'origine
> réapparaît, ses points s'y insèrent sans renuméroter ceux-ci.

---

## Traité

### Point 2 : Adresse canonique ✅

Le site ne déclarait aucune URL canonique. Ajout de `<link rel="canonical">`
dans le `<head>`.

**En attente d'une confirmation.** L'adresse retenue,
`https://elhadji-diatta.vercel.app`, est celle que suggère `DEPLOIEMENT.md`
§5 : elle n'a **pas** pu être vérifiée. Elle apparaît en quatre endroits
(`canonical`, `og:url`, `og:image`, `twitter:image`), signalés par un bloc
de commentaire en tête de `index.html` et par une case en tête de la
checklist de `DEPLOIEMENT.md`.

> Un `canonical` erroné est pire que pas de `canonical` : il demande
> explicitement à Google d'indexer une page qui n'existe pas. C'est le seul
> point de tout ce chantier qui a une conséquence négative s'il est oublié.

### Point 3 : Open Graph ✅

Le site ne portait aucune balise de partage : collé dans WhatsApp ou
LinkedIn, il n'affichait qu'une URL nue. Ajout de la série complète
`og:type`, `og:site_name`, `og:url`, `og:title`, `og:description`,
`og:image` (+ `alt`, `width`, `height`), `og:locale` et
`og:locale:alternate`, plus les équivalents Twitter/X.

Deux choix à signaler :

- **`twitter:card` vaut `summary`, pas `summary_large_image`.** Le visuel
  est la photo de profil, carrée. En `large_image`, X la recadrerait en 2:1
  et couperait la tête. À repasser en `large_image` le jour où une carte
  1200 × 630 dédiée la remplace (marche à suivre en `DEPLOIEMENT.md` §3.4).
- **`og:image` pointe sur la photo de profil**, faute de visuel dédié.
  Ça fonctionne, mais une carte 1200 × 630 aux couleurs de la charte
  ferait bien meilleure impression sur LinkedIn.

⚠️ **`assets/elhadji.jpeg` est en réalité un PNG** (1254 × 1254, 2,2 Mo)
portant une extension `.jpeg`. Les navigateurs s'en accommodent (le site
s'affiche correctement), mais certains robots d'aperçu se fient au
`Content-Type`, que Vercel déduit de l'extension. Voir `DEPLOIEMENT.md`
§3.4. Réenregistrer la photo en vrai JPEG la ferait au passage tomber de
2,2 Mo à ~200 Ko, ce qui est le gain de performance le plus facile du site.

### Point 1 : Les cartes projet promettaient des vidéos absentes ✅

Chaque carte affichait un bouton « Voir la démo » désactivé et un cadre
« démo vidéo à venir ». Six emplacements vides, sur la section qui doit
justement convaincre.

Remplacé par des **galeries de captures** (fonctionnalité A) : cent fois
plus légères qu'une vidéo, lisibles d'un coup d'œil, sans clic ni son.
Détail d'implémentation plus bas.

### Point 6 : `--line` trop faible pour porter une information ✅

`--line` (`#cbe3e0`) ne fait que **1,28:1** sur `--bg`. C'est un bon filet
de séparation, mais insuffisant dès qu'un trait ou une pastille *est* la
seule porteuse d'une information.

Deux tokens ajoutés plutôt qu'une modification de `--line` : le changer
globalement aurait assombri tous les filets décoratifs du site, ce qui
n'est pas le problème signalé :

| Token | Valeur | Contraste | Usage |
|---|---|---|---|
| `--line` | `#cbe3e0` | 1,28:1 | filets décoratifs, inchangé |
| `--line-strong` | `#a9cfca` | 1,66:1 | contours de commandes (flèches de galerie) |
| `--dot-idle` | `#6d9694` | **3,22:1** | pastille de galerie inactive |

> **Écart avec le cahier des charges, assumé.** Celui-ci demandait
> `#a9cfca` pour la pastille inactive. Mesuré sur le verre de
> `.gallery-dots`, `#a9cfca` ne monte qu'à **1,66:1**, mieux que 1,28,
> mais toujours sous les **3:1** qu'exige WCAG 1.4.11 pour un composant
> d'interface, et donc sous la barre que fixe la justification même du
> point 6. `#a9cfca` a été conservé pour les contours de flèches (où le
> bouton reste identifiable par son icône, très contrastée), et un token
> distinct `--dot-idle` a été introduit pour la pastille, qui est le seul
> cas où rien ne double l'information. Valeurs sombres correspondantes :
> `--d-line-strong: #4f7481`, `--d-dot-idle: #5e8794` (3,41:1).

### Point 12 : `portfolio.html` divergeait de `index.html` ✅

L'ancienne version tout-en-un a été supprimée au commit `e011dd3`. Le
paragraphe de `DEPLOIEMENT.md` qui expliquait comment s'en débarrasser est
devenu sans objet et a été retiré.

**La leçon a été appliquée au bilinguisme** : c'est exactement le motif
« deux fichiers censés dire la même chose » qui a fait écarter la voie des
deux pages statiques `/` et `/en/` (voir fonctionnalité C).

---

## A. Galeries de captures ✅

`js/gallery.js` (nouveau), `js/utils.js` (nouveau), styles dans
`css/components.css`, balisage dans les six `<article class="project">`.

### Comportement

| Aspect | Règle |
|---|---|
| Défilement | automatique, 4,5 s |
| Survol souris | pause |
| Focus clavier | pause tant que le focus est dans la galerie |
| Onglet en arrière-plan | pause (`visibilitychange`) |
| Hors écran | pause (`IntersectionObserver`, seuil 0,2) |
| Navigation | flèches toujours visibles, pastilles cliquables |
| Tactile | balayage horizontal, seuil 40 px |
| Clavier | ← → quand le focus est dans la galerie |
| Mouvement réduit | aucun défilement automatique, manuel seul |
| Une seule capture | ni flèche, ni pastille, ni minuterie |
| Aucune capture | cadre en pointillés, « captures à venir » |

**Après une action manuelle, le défilement automatique s'arrête
définitivement pour cette galerie.** Le visiteur a pris la main, on la lui
laisse. Reprendre l'automatique contre lui est le défaut classique de ces
composants : on s'arrête sur une capture, elle s'échappe.

### Choix d'implémentation

- **Pas de GSAP.** La transition (opacity + translateX, 400 ms) est en CSS.
  Le composant doit rester utilisable si GSAP échoue à charger, et il n'y a
  rien ici qu'une transition CSS ne sache faire. En `prefers-reduced-motion`,
  `base.css` coupe déjà toutes les transitions : le changement devient
  instantané, et l'automatique est désactivé côté JS.
- **Sonde avant affichage.** `exists()` (requête HEAD) est sortie de
  `media.js` vers `js/utils.js`, partagée avec la logique du CV. Seules les
  captures réellement présentes sont montées. Zéro capture trouvée → le
  repli HTML `.gallery-empty` reste en place. Un `onerror` sur chaque
  `<img>` rattrape le cas d'un fichier disparu entre la sonde et
  l'affichage.
- **Chargement progressif.** Seules la capture courante et la suivante sont
  chargées ; les autres sont en `loading="lazy"`, et la suivante est
  préchargée à chaque changement. Six galeries × plusieurs captures, tout
  charger au démarrage ferait payer au visiteur des images qu'il ne verra
  peut-être jamais.
- **Ratio fixe 16/10** porté par `.gallery-viewport` **et** par l'état
  d'attente : la carte occupe la même hauteur dans les deux cas, la grille
  ne saute donc ni au chargement ni au changement d'image.
- **Descriptions alternatives obligatoires**, via `data-alts` (séparateur
  `|`, même ordre que `data-shots`) et traduites via `data-i18n-alts`.
  Elles sont indexées sur la position **d'origine** : une capture manquante
  ne décale pas les légendes des suivantes.

### Reste à faire

**Les fichiers `.webp` n'ont pas été produits** : ce sont des captures des
applications réelles d'Elhadji, que seul lui peut réaliser. L'arborescence
`assets/shots/<projet>/` est en place avec un `README.md` détaillant format
et marche à suivre. En attendant, les six cartes affichent proprement
« captures à venir », qui est le comportement de repli prévu.

---

## B. Sélecteur de thème ✅

`js/theme.js` (nouveau), restructuration de `css/variables.css`, script
inline dans le `<head>`, bouton dans `.statusbar`.

### Trois états, pas deux

`auto → clair → sombre → auto`. `auto` est le défaut et suit l'OS.

Deux états auraient suffi à basculer, mais auraient piégé le visiteur : sur
un OS en sombre, essayer le clair l'aurait enfermé dans un choix explicite
ne suivant plus jamais son système.

### La restructuration des tokens

Le bloc sombre vivait dans un `@media (prefers-color-scheme: dark)`, donc
impossible à surcharger par un attribut. Le thème sombre doit être
atteignable par deux voies (choix manuel et préférence système), ce que
CSS ne sait pas exprimer sans dupliquer.

**Ce qui est dupliqué : la liste des branchements. Pas les valeurs.** Les
vingt et une couleurs sombres sont définies une seule fois en `--d-*` dans
`:root`, et les deux règles sombres se contentent de les brancher
(`--bg: var(--d-bg)`). Un branchement oublié saute aux yeux (l'élément
reste clair) ; deux valeurs désynchronisées, elles, ne se verraient qu'en
comparant les deux thèmes côte à côte.

Un contrôle `diff` figure en `DEPLOIEMENT.md` §3.5.

### Effets de bord traités

- **`.project-head`** portait son propre `@media (prefers-color-scheme:
  dark)` dans `components.css`, qui n'aurait pas suivi un choix manuel.
  Remplacé par deux tokens `--head-line` / `--head-veil`. Toute la
  connaissance du thème est redescendue dans `variables.css`.
- **`.btn-mail`** (point de vigilance du cahier des charges) utilisait
  `var(--accent-bright)`, qui change de valeur entre clair et sombre : le
  bouton changeait donc de teinte sur un panneau qui, lui, ne s'inverse
  jamais. Trois tokens `--on-dark-*` ont été introduits, définis une seule
  fois et **jamais** redéfinis dans un bloc sombre. Vérifié : fond
  `#5ea3a3` et texte `#0f1f2b` dans les trois états, soit 5,79:1.

### Anti-scintillement

Script inline non différé en tête de `<head>`, avant les feuilles de style,
sous `try/catch` (`localStorage` lève en navigation privée sur certaines
configurations, et une erreur non rattrapée y bloquerait le rendu). Il pose
`data-theme`, `lang`, la classe `.js` et la balise `theme-color`.

`js/theme.js` est chargé en `defer` : il ne gère que l'interaction.

---

## C. Bilinguisme français / anglais ✅

`js/i18n.js` (nouveau), `i18n/fr.json` + `i18n/en.json` (187 clés chacun),
attributs `data-i18n*` dans `index.html`, chaînes externalisées de
`contact-form.js`, `media.js` et `gallery.js`.

### L'arbitrage : voie 1 (JS seul, une URL)

| Voie | Référencement EN | Coût | Risque |
|---|---|---|---|
| **1. JS seul, une URL** ← retenue | nul | faible | aucun |
| 2. Deux pages statiques `/` et `/en/` | complet | élevé | dérive entre les deux |
| 3. JS + page EN générée au build | complet | moyen | ajoute un `npm run build` |

**Conséquence assumée : les moteurs de recherche n'indexent que le
français**, puisqu'ils lisent le HTML brut. Un recruteur anglophone
cherchant « Spring Boot developer Senegal » ne trouvera pas le site.

C'est le bon compromis ici : la quasi-totalité des visiteurs d'un portfolio
de candidature arrivent par un lien direct (candidature, LinkedIn, CV), pas
par une recherche. La voie 2 reproduirait exactement le point 12. La voie 3
le résout proprement mais ajoute une étape de build à un projet dont la
simplicité est un atout réel.

**Les traductions sont déjà dans des JSON séparés** : le jour où le
référencement anglais compte, générer une page `/en/` devient une formalité.

### Détection et persistance

Par ordre de priorité : `?lang=en` → `localStorage` → `navigator.language`
→ `fr`. Posé dans le script inline du `<head>`, donc `<html lang>` est
correct dès le premier rendu.

Le paramètre d'URL prime volontairement : c'est ce qui permet d'envoyer un
lien pré-traduit dans une candidature. À chaque bascule, l'URL est
réécrite en `history.replaceState` : `replaceState` et non `pushState`, la
bascule n'étant pas une navigation.

### Le JSON reste la source éditable

Les textes français sont écrits en dur dans `index.html`, mais seulement
comme repli : au chargement, `js/i18n.js` applique `i18n/fr.json` même si la
page reste en français. Modifier `fr.json` suffit donc à mettre à jour le
français ; si le JSON ne charge pas, le HTML brut reste intégralement
lisible.

### Attributs reconnus

| Attribut | Effet |
|---|---|
| `data-i18n` | `textContent` |
| `data-i18n-html` | `innerHTML`, réservé aux chaînes contenant du balisage |
| `data-i18n-attr="placeholder:clé,…"` | un ou plusieurs attributs |
| `data-i18n-query="subject:clé,…"` | query string d'un `href` (`mailto:`, `wa.me`) |
| `data-i18n-alts="shots.projet"` | légendes des captures d'une galerie |

`data-i18n-html` est réservé au `<em>` du titre et aux `<strong>` des
paragraphes : aucune raison d'ouvrir une porte d'injection pour du texte
plat.

### Le piège du double encodage

Les `href` de `mailto:` du HTML sont déjà encodés
(`Demande%20d'acc%C3%A8s`). Les réencoder produirait `%2520` dans le client
mail du visiteur. `applyQuery()` repart donc toujours de la base mémorisée
(avant le `?`) et encode une seule fois des valeurs stockées **en clair**
dans le JSON. Vérifié sur les quatre liens concernés.

### Le CV suit la langue

`media.js` cherche `assets/cv-elhadji-diatta-en.pdf` en anglais et
**retombe sur la version française** si elle n'existe pas, plutôt que de
neutraliser le bouton : un CV en français vaut infiniment mieux que pas de
CV. ⚠️ La version anglaise du CV reste à produire.

### Sur la traduction elle-même

Le texte français a une voix ; une traduction littérale l'aplatirait. Les
adaptations retenues :

| Français | Anglais |
|---|---|
| Du code qui tourne, pas seulement du code qui compile. | Code that runs, not just code that compiles. |
| …les déploie, et les administre. | …deploys them, and keeps them running. |
| En route vers l'ingénierie DevOps | Moving into DevOps engineering |
| Un projet à développer, déployer ou administrer ? | Something to build, ship, or keep running? |
| conçu et déployé à la main | hand-built, hand-deployed |
| écrivez-moi directement | message me directly |
| Ce qui me distingue | What sets me apart |
| acquis / en cours | covered / in progress |
| Disponible pour un stage | Open to an internship |

⚠️ **Le faux ami « stage ».** Le site emploie le mot dans deux sens : étape
de pipeline (`stage: build`), qui reste `stage`, et période en entreprise,
qui devient `internship`. Les clés JSON ne les mélangent pas, vérifié.

---

## Vérifications passées

Testé sous Firefox headless piloté en WebDriver, sur serveur local.

**Galeries** : 6 figures montées · défilement automatique à 4,5 s confirmé
sur deux cycles · pause effective onglet en arrière-plan · **l'automatique
ne reprend pas** après clic sur une flèche · ← → fonctionnels · pastille
cliquable · galerie à une seule capture sans flèche ni pastille · galerie
sans capture conservant son repli · en `prefers-reduced-motion` aucun
défilement automatique mais navigation manuelle intacte (`transition-duration`
mesurée à `0s`).

**Thème** : cycle `auto → clair → sombre → auto` confirmé ·
`localStorage` écrit puis effacé au retour en `auto` · sur un OS en sombre,
« auto » rend bien un fond `#0f1f2b` et le choix « clair » l'emporte ·
`theme-color` suit les trois états · les deux blocs sombres sont identiques
(21 branchements, `diff` vide) · `.btn-mail` stable dans les trois états.

**Langues** : `?lang=en` et `?lang=fr` corrects dès le premier rendu ·
`<html lang>` suit · bascule au clic dans les deux sens · URL réécrite ·
`og:locale` suit · les quatre `mailto:`/`wa.me` encodés une seule fois
(aucun `%25`) · formulaire soumis vide en anglais : les trois erreurs et la
ligne de statut sont en anglais, et se retraduisent à chaud à la bascule ·
**balayage complet du DOM** (texte, `aria-label`, `title`, `placeholder`,
`alt`) : aucune chaîne française résiduelle en mode anglais · parité des
clés : 187 / 187.

## Reste à faire

| Sujet | Qui | Détail |
|---|---|---|
| Confirmer l'adresse publique | Elhadji | 4 occurrences dans `index.html`, voir point 2 |
| Produire les captures `.webp` | Elhadji | `assets/shots/README.md` |
| Produire le CV anglais | Elhadji | `assets/cv-elhadji-diatta-en.pdf` |
| Réenregistrer la photo en vrai JPEG | Elhadji | 2,2 Mo → ~200 Ko, voir point 3 |
| Carte d'aperçu 1200 × 630 | - | `DEPLOIEMENT.md` §3.4, facultatif |
| Voie 3 (page `/en/` générée) | - | seulement si le référencement EN devient un besoin |
