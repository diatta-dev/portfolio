# Mettre le portfolio en ligne : GitHub puis Vercel

Guide pas à pas, du dossier local jusqu'à l'adresse publique.
Aucune étape ne demande de carte bancaire : GitHub et Vercel sont gratuits
pour ce type de site.

**Durée : environ 20 minutes la première fois.**

---

## 0. Avant de commencer

Le site est **statique** (HTML, CSS, JS : pas de serveur, pas de base de
données). C'est le cas le plus simple à déployer : Vercel se contente de
servir les fichiers tels quels, sans rien compiler.

### Ce qu'il faut avoir sous la main

| Élément | État | Où |
|---|---|---|
| Un compte GitHub | à créer si besoin | <https://github.com/signup> |
| Un compte Vercel | à créer avec « Continue with GitHub » | <https://vercel.com/signup> |
| Git installé | ✅ déjà présent (version 2.43) | - |

### Checklist des fichiers à finaliser

Faites-la **avant** le premier envoi, ça évite de tout recommencer :

- [ ] **Adresse publique** : remplacer les 4 occurrences de
      `https://elhadji-diatta.vercel.app` dans `index.html` (balises
      `canonical`, `og:url`, `og:image`, `twitter:image`) par l'adresse
      réelle donnée par Vercel à l'étape §3.2. **C'est le seul point de
      cette liste qui a une conséquence négative s'il est oublié** : un
      `canonical` faux demande à Google d'indexer une page qui n'existe pas.
- [ ] **Clé Web3Forms** : remplacer `VOTRE_CLE_WEB3FORMS` par votre vraie clé
      dans `index.html` (attribut `data-access-key` du formulaire). Sans ça,
      le formulaire bascule sur le client mail du visiteur au lieu de vous
      envoyer le message.
- [ ] **CV** : déposer le PDF en `assets/cv-elhadji-diatta.pdf`, et sa
      version anglaise en `assets/cv-elhadji-diatta-en.pdf`. Si l'anglaise
      manque, le site sert la française plutôt que de couper le bouton.
- [ ] **Captures des projets** : déposer les `.webp` dans
      `assets/shots/<projet>/`. Voir `assets/shots/README.md` pour le
      format et la marche à suivre.

> À part l'adresse publique, rien de tout cela n'est bloquant : le site
> fonctionne et s'affiche proprement même si ces fichiers manquent (bouton
> CV neutralisé, cadres « captures à venir »). Vous pourrez les ajouter
> plus tard, chaque envoi vers GitHub redéploie le site automatiquement.

---

## 1. Préparer le dépôt local

Ouvrez un terminal dans le dossier du projet :

```bash
cd /home/diatta/Documents/portfolio
```

### 1.1 Créer le fichier `.gitignore`

Il évite d'envoyer sur GitHub des fichiers inutiles ou personnels :

```bash
cat > .gitignore <<'EOF'
# outils locaux
.claude/
.vercel/

# fichiers temporaires
_preview.html
*.log
*.tmp
.DS_Store
EOF
```

### 1.2 Initialiser le dépôt et faire le premier commit

```bash
git init -b main
git add .
git commit -m "Portfolio : version initiale"
```

Si Git réclame votre identité, configurez-la une fois pour toutes :

```bash
git config --global user.name "Elhadji Ba Diaby Diatta"
git config --global user.email "elhadjidiatta25@gmail.com"
```

> L'adresse email servira à signer vos commits et sera **visible
> publiquement**. Si vous préférez la masquer, GitHub fournit une adresse
> de substitution dans *Settings → Emails → Keep my email addresses private*.

### 1.3 Vérifier ce qui va partir

```bash
git status
git ls-files | head -30
```

Vous devez y voir `index.html`, les dossiers `css/`, `js/`, `assets/`,
et **pas** `.claude/`.

> `git ls-files` ne montrera pas `assets/videos/` s'il est vide : Git ne
> suit pas les dossiers vides. Le dossier apparaîtra dès que vous y aurez
> déposé une vidéo.

---

## 2. Créer le dépôt sur GitHub et l'envoyer

L'outil `gh` n'est pas installé sur votre machine, on passe donc par le
site web.

### 2.1 Créer le dépôt vide

1. Allez sur <https://github.com/new>.
2. **Repository name** : `portfolio`
3. **Description** : `Portfolio, développeur full stack & administrateur systèmes`
4. Cochez **Public** (nécessaire pour que Vercel y accède gratuitement, et
   c'est le but d'un portfolio).
5. **Ne cochez rien d'autre** : pas de README, pas de .gitignore, pas de
   licence. Le dépôt doit rester vide, sinon l'envoi sera refusé.
6. Cliquez **Create repository**.

### 2.2 Relier et envoyer

Remplacez `VOTRE-PSEUDO` par votre nom d'utilisateur GitHub :

```bash
git remote add origin https://github.com/VOTRE-PSEUDO/portfolio.git
git push -u origin main
```

GitHub demandera vos identifiants. **Le mot de passe du compte ne
fonctionne pas** : il faut un *Personal Access Token*.

<details>
<summary>Créer un token (à faire une seule fois)</summary>

1. <https://github.com/settings/tokens> → **Generate new token (classic)**
2. *Note* : `portfolio`, *Expiration* : 90 jours ou plus
3. Cochez la case **`repo`**
4. **Generate token**, puis **copiez-le immédiatement** (il ne sera plus
   jamais affiché)
5. Collez ce token quand Git demande le mot de passe

Pour ne pas le retaper à chaque fois :

```bash
git config --global credential.helper store
```

(le token sera alors enregistré en clair dans `~/.git-credentials`)

</details>

Rechargez la page de votre dépôt : vos fichiers doivent y être.

---

## 3. Déployer sur Vercel

### 3.1 Importer le dépôt

1. Allez sur <https://vercel.com/new>.
2. Connectez-vous avec **Continue with GitHub**, autorisez l'accès.
3. Dans la liste des dépôts, trouvez `portfolio` → **Import**.

### 3.2 Réglages

Vercel ne détectera aucun framework, c'est normal et c'est ce qu'on veut :

| Champ | Valeur |
|---|---|
| Framework Preset | **Other** |
| Root Directory | `./` (ne pas toucher) |
| Build Command | **laisser vide** |
| Output Directory | **laisser vide** |
| Install Command | **laisser vide** |

Cliquez **Deploy**. Une minute plus tard, le site est en ligne sur une
adresse du type :

```
https://portfolio-xxxx.vercel.app
```

### 3.3 Vérifier une fois en ligne

- [ ] La page s'affiche, les animations se déclenchent au défilement
- [ ] Les logos des technos apparaissent (ils viennent d'un CDN externe)
- [ ] Le bouton **Télécharger mon CV** lance bien le téléchargement
- [ ] Les **galeries** défilent toutes seules ; au clic sur une flèche,
      le défilement automatique s'arrête pour de bon (c'est voulu)
- [ ] Le **sélecteur de thème** (barre du haut) : clair ⇄ sombre, le
      changement est visible **immédiatement, sans avoir à faire défiler**
      (à vérifier sur téléphone : c'est là que le défaut se voyait), et le
      choix survit à un rechargement
- [ ] **Suivi de l'appareil**, à vérifier dans une fenêtre de navigation
      privée (sinon un choix mémorisé masque le comportement) : à la
      première visite le site prend le thème du téléphone, et changer ce
      réglage pendant la visite change le site sans recharger. Après un
      clic sur le bouton, le choix l'emporte et ne bouge plus
- [ ] Le **sélecteur de langue** : `EN` bascule tout le site, l'adresse
      devient `…/?lang=en`, et ce lien rouvre bien le site en anglais
- [ ] Le **formulaire** : envoyez-vous un message de test, vous devez le
      recevoir par mail en quelques secondes
- [ ] Les liens **WhatsApp** et **LinkedIn** ouvrent les bonnes pages
- [ ] Collez l'adresse du site dans un message WhatsApp ou LinkedIn :
      l'aperçu doit montrer le titre, la description et la photo
- [ ] Testez sur téléphone (l'adresse `.vercel.app` fonctionne partout)

### 3.4 L'image d'aperçu des réseaux sociaux

Le site utilise `assets/elhadji.jpeg` comme visuel d'aperçu. Ça fonctionne,
mais une **carte dédiée en 1200 × 630** (nom + titre + un aplat de la
charte) donnerait un aperçu nettement plus professionnel sur LinkedIn.
Le jour où vous en créez une :

1. déposez-la en `assets/og-card.png` ;
2. dans `index.html`, faites pointer `og:image` et `twitter:image` dessus,
   corrigez `og:image:width`/`height` en `1200`/`630` ;
3. passez `twitter:card` de `summary` à `summary_large_image`.

> ⚠️ `assets/elhadji.jpeg` est **en réalité un fichier PNG** portant une
> extension `.jpeg`, et pèse 2,2 Mo. Les navigateurs s'en accommodent, mais
> certains robots d'aperçu se fient au `Content-Type` (que Vercel déduit de
> l'extension, donc `image/jpeg`) et refusent une image dont les octets ne
> correspondent pas. Si l'aperçu ne s'affiche pas sur un réseau, c'est la
> première chose à corriger : réenregistrez la photo en vrai JPEG, à
> 1254 px de large et qualité 82 : vous passerez de 2,2 Mo à ~200 Ko, ce
> qui accélérera aussi nettement le premier affichage du site.

### 3.5 Contrôles réservés au développement

Deux garde-fous ne s'exécutent qu'en local (ou avec `?i18ncheck` dans
l'adresse), pour ne rien imposer aux visiteurs :

- **Parité des traductions.** Ouvrez la console : `js/i18n.js` compare
  `i18n/fr.json` et `i18n/en.json` et liste toute clé présente d'un côté
  seulement. Le message attendu est
  `[i18n] fr.json et en.json : N clés, parité OK.`
- **Synchronisation des blocs sombres.** `css/variables.css` contient la
  règle sombre principale (`:root[data-theme="dark"]`, celle que voient
  tous les visiteurs) et un repli pour les navigateurs sans JavaScript
  (`html:not(.js)` sous media query). Les deux listes de branchements
  doivent rester identiques. Pour le vérifier :

  ```bash
  awk '/^:root\[data-theme="dark"\]\{/,/^\}/'  css/variables.css \
    | grep 'var(--d-' | sed 's/^ *//' | sort > /tmp/a
  awk '/^  html:not\(\.js\)\{/,/^  \}/'        css/variables.css \
    | grep 'var(--d-' | sed 's/^ *//' | sort > /tmp/b
  diff /tmp/a /tmp/b && echo "blocs synchronisés ($(wc -l < /tmp/a) tokens)"
  ```

  Le découpage se fait sur les accolades, et non sur un `grep -A30` :
  les deux blocs n'ont pas la même indentation ni la même longueur
  d'en-tête, un nombre de lignes fixe en tronquait un des deux.

---

## 4. Mettre le site à jour

C'est là que tout devient simple : **chaque envoi vers GitHub redéploie
le site automatiquement**, en une minute environ.

```bash
cd /home/diatta/Documents/portfolio

# … vous ajoutez une vidéo, corrigez un texte …

git add .
git commit -m "Ajout de la démo du projet de mémoire"
git push
```

Suivez l'avancement dans l'onglet **Deployments** de votre projet Vercel.
En cas d'erreur, le déploiement précédent reste en ligne : le site public
n'est jamais cassé entre deux versions.

---

## 4 bis. Ajouter une capture, corriger une traduction

Les deux gestes d'entretien courants du site.

### Ajouter des captures à un projet

1. Exportez vos captures en WebP, 1280 px de large, qualité 80
   (`cwebp -q 80 -resize 1280 0 capture.png -o 01.webp`).
2. Déposez-les dans `assets/shots/<projet>/`, numérotées `01`, `02`, `03`…
   C'est cet ordre qui fait l'ordre de défilement.
3. Dans `index.html`, sur la `<figure class="project-gallery">` du projet,
   complétez `data-shots` (les chemins, séparés par des virgules) **et**
   `data-alts` (les descriptions françaises, séparées par des barres `|`,
   dans le même ordre).
4. Dans `i18n/fr.json` et `i18n/en.json`, ajoutez les clés
   `shots.<projet>.1`, `.2`, `.3`… avec les mêmes descriptions.
5. `git add . && git commit -m "Captures du projet X" && git push`

La description alternative n'est pas décorative : sans elle, la capture est
une image vide pour un lecteur d'écran. Décrivez ce que la capture
**montre**, pas ce qu'elle est.

> Le nombre de captures est libre. Avec une seule, la galerie n'affiche ni
> flèches ni pastilles : c'est voulu, des commandes qui ne commandent rien
> sont du bruit. Avec zéro, la carte garde le cadre « captures à venir ».

### Corriger ou ajouter une traduction

Tout le texte anglais vit dans `i18n/en.json`. Le français éditable vit dans
`i18n/fr.json` : au chargement, `js/i18n.js` applique ce dictionnaire même
quand la page est en français. Les textes en dur dans `index.html` restent
seulement le repli si le JSON ne charge pas.

Pour corriger une phrase française, modifiez `i18n/fr.json`.
Pour corriger une phrase anglaise, `i18n/en.json` suffit.

`fr.json` et `en.json` doivent porter exactement le même jeu de clés.
Ouvrez la console en local pour le vérifier (voir §3.5).

⚠️ **Le mot « stage ».** Le site l'emploie dans deux sens :
l'étape de pipeline (`stage: build`), qui reste `stage` en anglais, et la
période en entreprise, qui devient `internship`. Ne les mélangez pas.

---

## 5. Nom de domaine personnalisé (facultatif)

L'adresse `.vercel.app` est parfaite pour une candidature. Si vous voulez
un `elhadjidiatta.com` :

1. Achetez le domaine (Namecheap, OVH, Gandi… environ 10 €/an).
2. Dans Vercel : **Settings → Domains → Add**, saisissez le domaine.
3. Vercel affiche les enregistrements DNS à créer chez votre registrar
   (généralement un `A` vers `76.76.21.21` et un `CNAME` pour `www`).
4. Comptez jusqu'à 24 h de propagation. Le certificat HTTPS est
   automatique et gratuit.

Astuce gratuite en attendant : renommez le projet dans
**Settings → General → Project Name** pour obtenir
`elhadji-diatta.vercel.app` plutôt qu'un nom à rallonge.

---

## 6. Points de vigilance

**La clé Web3Forms est visible dans le code source.** C'est normal et sans
danger : cette clé est conçue pour être publique, elle ne permet que
d'envoyer un message vers votre boîte mail. Elle ne donne accès à rien
d'autre. Si vous recevez du spam, régénérez-la depuis votre tableau de bord
Web3Forms.

**Votre CV sera téléchargeable par n'importe qui.** Vérifiez ce qu'il
contient avant de le publier : une adresse postale complète ou un numéro de
pièce d'identité n'ont rien à faire sur un site public. Le numéro de
téléphone et l'email, eux, sont déjà affichés volontairement.

**Les captures sont hébergées avec le site.** En WebP à 60–120 Ko pièce,
une dizaine de captures pèsent moins qu'une seule photo non compressée :
les 100 Go de bande passante mensuels du plan gratuit de Vercel ne sont pas
près d'être atteints. Les galeries ne chargent d'ailleurs que la capture
affichée et la suivante.

**Le thème et la langue sont mémorisés dans le navigateur du visiteur**
(`localStorage`), pas sur un serveur. Rien n'est envoyé nulle part, et un
visiteur en navigation privée retrouve simplement les réglages par défaut :
thème automatique, et langue déduite de son navigateur.

---

## 7. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `remote origin already exists` | commande relancée deux fois | `git remote set-url origin <URL>` |
| `Authentication failed` au push | mot de passe utilisé au lieu du token | créer un token (voir §2.2) |
| `Updates were rejected` | le dépôt GitHub n'était pas vide | `git pull --rebase origin main` puis `git push` |
| Page blanche sur Vercel | mauvais *Output Directory* | Settings → Build & Development : tout vider, redéployer |
| Le formulaire n'envoie rien | clé Web3Forms absente | vérifier `index.html` ligne 753 |
| Bouton CV grisé | PDF absent du dépôt | vérifier avec `git ls-files assets/` |
| Cartes « captures à venir » | `.webp` absents | vérifier `git ls-files assets/shots/` |
| Le site s'ouvre en anglais | votre navigateur est en anglais | c'est voulu ; `?lang=fr` force le français |
| La bascule de langue ne fait rien | `i18n/*.json` non déployés | vérifier `git ls-files i18n/` |
| Aperçu absent sur LinkedIn | `og:image` en chemin relatif, ou URL non remplacée | voir §0 et §3.4 |
| Les logos des technos manquent | CDN bloqué par le réseau du visiteur | sans gravité, le nom s'affiche à la place |

---

## Aide-mémoire

```bash
# Lancer le site en local (port 8888)
cd /home/diatta/Documents/portfolio && python3 -m http.server 8888
# → http://localhost:8888        (Ctrl+C pour arrêter)

# Publier une modification
git add . && git commit -m "message" && git push

# Voir l'état du dépôt
git status
git log --oneline -5
```
