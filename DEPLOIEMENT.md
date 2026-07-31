# Mettre le portfolio en ligne — GitHub puis Vercel

Guide pas à pas, du dossier local jusqu'à l'adresse publique.
Aucune étape ne demande de carte bancaire : GitHub et Vercel sont gratuits
pour ce type de site.

**Durée : environ 20 minutes la première fois.**

---

## 0. Avant de commencer

Le site est **statique** (HTML, CSS, JS — pas de serveur, pas de base de
données). C'est le cas le plus simple à déployer : Vercel se contente de
servir les fichiers tels quels, sans rien compiler.

### Ce qu'il faut avoir sous la main

| Élément | État | Où |
|---|---|---|
| Un compte GitHub | à créer si besoin | <https://github.com/signup> |
| Un compte Vercel | à créer avec « Continue with GitHub » | <https://vercel.com/signup> |
| Git installé | ✅ déjà présent (version 2.43) | — |

### Checklist des fichiers à finaliser

Faites-la **avant** le premier envoi, ça évite de tout recommencer :

- [ ] **Clé Web3Forms** — remplacer `VOTRE_CLE_WEB3FORMS` par votre vraie clé
      dans `index.html` (ligne 753). Sans ça, le formulaire bascule sur le
      client mail du visiteur au lieu de vous envoyer le message.
- [ ] **CV** — déposer le PDF en `assets/cv-elhadji-diatta.pdf`.
- [ ] **Vidéos de démo** — déposer les `.mp4` dans `assets/videos/`
      (`dossiers-judiciaires.mp4`, `thies-ville.mp4`, `tontine-app.mp4`,
      `insertion-pro.mp4`, `infra-server.mp4`, `stock-model.mp4`).
      Les vignettes `.jpg` du même nom sont facultatives.

> Rien de tout cela n'est bloquant : le site fonctionne et s'affiche
> proprement même si ces fichiers manquent (boutons grisés, cadres
> « démo à venir »). Vous pourrez les ajouter plus tard, chaque envoi
> vers GitHub redéploie le site automatiquement.

⚠️ **Attention à la taille des vidéos.** GitHub refuse tout fichier de plus
de 100 Mo, et un site lourd met du temps à charger. Visez **moins de 20 Mo
par vidéo** (compressez, réduisez en 720p, coupez au plus court).
Si une démo dépasse largement, mettez-la sur YouTube en « non répertoriée »
et remplacez le bloc `<figure class="project-media">` de la carte concernée
par une iframe YouTube.

---

## 1. Préparer le dépôt local

Ouvrez un terminal dans le dossier du projet :

```bash
cd /home/diatta/Documents/porfolio
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

Vous devez y voir `index.html`, les dossiers `css/`, `js/`, `assets/` —
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
   *(le dossier local s'appelle `porfolio` — une faute de frappe ; profitez-en
   pour donner le bon nom au dépôt, ça n'a aucune conséquence technique).*
3. **Description** : `Portfolio — développeur full stack & administrateur systèmes`
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
- [ ] Les boutons **Voir la démo** lisent les vidéos déposées
- [ ] Le **formulaire** : envoyez-vous un message de test, vous devez le
      recevoir par mail en quelques secondes
- [ ] Les liens **WhatsApp** et **LinkedIn** ouvrent les bonnes pages
- [ ] Testez sur téléphone (l'adresse `.vercel.app` fonctionne partout)

---

## 4. Mettre le site à jour

C'est là que tout devient simple : **chaque envoi vers GitHub redéploie
le site automatiquement**, en une minute environ.

```bash
cd /home/diatta/Documents/porfolio

# … vous ajoutez une vidéo, corrigez un texte …

git add .
git commit -m "Ajout de la démo du projet de mémoire"
git push
```

Suivez l'avancement dans l'onglet **Deployments** de votre projet Vercel.
En cas d'erreur, le déploiement précédent reste en ligne : le site public
n'est jamais cassé entre deux versions.

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

**Le fichier `portfolio.html`** est l'ancienne version tout-en-un du site.
Il sera envoyé sur GitHub et accessible à l'adresse `/portfolio.html`. Si
vous ne voulez plus le garder :

```bash
git rm portfolio.html
git commit -m "Suppression de l'ancienne version du portfolio"
git push
```

**Les vidéos sont hébergées avec le site.** Le plan gratuit de Vercel offre
100 Go de bande passante par mois — largement suffisant, sauf si le site
reçoit énormément de visites avec des vidéos très lourdes. Une raison de
plus pour les compresser.

---

## 7. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `remote origin already exists` | commande relancée deux fois | `git remote set-url origin <URL>` |
| `Authentication failed` au push | mot de passe utilisé au lieu du token | créer un token (voir §2.2) |
| `Updates were rejected` | le dépôt GitHub n'était pas vide | `git pull --rebase origin main` puis `git push` |
| Page blanche sur Vercel | mauvais *Output Directory* | Settings → Build & Development : tout vider, redéployer |
| Le formulaire n'envoie rien | clé Web3Forms absente | vérifier `index.html` ligne 753 |
| Boutons vidéo/CV grisés | fichiers absents du dépôt | vérifier avec `git ls-files assets/` |
| Les logos des technos manquent | CDN bloqué par le réseau du visiteur | sans gravité, le nom s'affiche à la place |

---

## Aide-mémoire

```bash
# Lancer le site en local (port 8888)
cd /home/diatta/Documents/porfolio && python3 -m http.server 8888
# → http://localhost:8888        (Ctrl+C pour arrêter)

# Publier une modification
git add . && git commit -m "message" && git push

# Voir l'état du dépôt
git status
git log --oneline -5
```
