# Tirets cadratins et synchronisation des traductions

Deux conventions du dépôt, et l'outillage qui les fait tenir.

> Ce fichier est le seul du dépôt à contenir des tirets cadratins : il faut
> bien montrer le caractère dont il parle. Le hook ne contrôle que `.html`
> et `.json`, donc cette exception ne le déclenche pas.

---

## 1. Aucun tiret cadratin dans le contenu

### Pourquoi pas un simple remplacement global

```bash
sed -i 's/—//g' index.html      # NE PAS FAIRE
```

C'est exactement ce qui a produit `Développeur full stack  Java/Spring Boot`
avec son double espace. Un tiret cadratin porte une fonction grammaticale :
le retirer sans la remplacer laisse une phrase amputée.

### Le remplacement dépend de la fonction

| Fonction | Exemple | Remplacement |
|---|---|---|
| Séparateur d'étiquette | `stage: build — à-propos` | `·` (point médian) |
| Incise, apposition | `full stack — Java, PHP — et admin` | parenthèses, ou virgules |
| Annonce, explication | `les dépôts sont privés — chaque projet…` | deux-points |
| Intervalle | `2021 — 2026` | trait d'union simple |

Deux cas particuliers déjà tranchés :

- **`<title>` et `og:title`** : barre verticale. Le point médian sépare déjà
  les trois rôles (`Full Stack · Admin Systèmes · DevOps`) ; une quatrième
  occurrence d'affilée devient illisible.
- **Bannières de fichier** (`LAYOUT — structure de page : …`) : point médian
  quand la ligne contient déjà un deux-points, sinon deux-points.

En français, le deux-points prend une espace avant (` : `) ; en anglais, non
(`: `). Le reste du dépôt suit déjà cette règle.

### Le garde-fou

`.git/hooks/pre-commit` refuse tout commit qui réintroduit le caractère dans
un `.html` ou un `.json` indexé. La copie versionnée est `tools/pre-commit` :
`.git/hooks/` n'est pas suivi par git, donc après un nouveau clone il faut
réinstaller le hook.

```bash
cp tools/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Ce hook ne remplace pas un diagnostic.** Il se contourne avec
`git commit --no-verify`, et selon l'outil qui déclenche le commit il peut
ne pas être exécuté du tout. Tant que le processus qui commite
automatiquement n'est pas identifié, le problème de fond reste entier.

---

## 2. Synchronisation français vers anglais

### Ce que ça résout

Le défaut classique de ce type de site : on modifie une phrase française,
on oublie l'anglaise, et le site reste en ligne à moitié traduit sans qu'on
le sache. C'est invisible depuis la version française.

Une traduction automatique et parfaite n'existe pas. Ce qui est atteignable :

1. détection de ce qui a changé côté français, fiable à 100 %
2. traduction automatique de ces seules chaînes, brouillon de bonne qualité
3. relecture manuelle portant uniquement sur le diff, deux ou trois lignes

On ne relit jamais les 180 clés, seulement celles qu'on vient de toucher.

### Le mécanisme

```
i18n/fr.json      source de vérité, éditée à la main
i18n/en.json      traduction, éditable à la main aussi
i18n/.sync.json   empreintes, écrites par l'outil, jamais éditées
```

`.sync.json` retient l'empreinte SHA-256 de la valeur française telle qu'elle
était quand l'anglais a été validé. Si le français change ensuite, l'empreinte
ne correspond plus et la clé est signalée comme périmée. C'est ce qui
distingue « jamais traduit » de « traduit, puis modifié côté français », le
second cas étant précisément celui qui passe inaperçu autrement.

`.sync.json` doit être versionné : c'est lui qui porte la mémoire de l'état
validé.

### Installation

Une seule fois, l'état actuel devient la référence :

```bash
node tools/i18n.js accept
```

Rien n'est réécrit, les traductions existantes sont considérées à jour.

### Usage quotidien

```bash
# après avoir modifié une phrase dans i18n/fr.json
node tools/i18n.js check
```

```
i18n : 181 clés fr, 181 clés en

  1 périmée(s) : le français a changé
    hero.lede
```

```bash
node tools/i18n.js translate
```

L'outil ne traduit que cette clé, affiche le français et l'anglais côte à
côte pour relecture, et met à jour l'empreinte. Si la formulation ne
convient pas, corriger `en.json` à la main puis :

```bash
node tools/i18n.js accept
```

`check` sort en code 1 dès qu'une clé manque, est périmée ou est orpheline.
Le hook pre-commit s'en sert quand `fr.json` fait partie du commit.

### Clé API

`translate` appelle l'API Claude. `check` et `accept` fonctionnent hors ligne.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# ou, après un `ant auth login` :
export ANTHROPIC_AUTH_TOKEN=$(ant auth print-credentials --access-token)
```

### Deux détails d'implémentation qui comptent

**Le ton se conserve.** Le script envoie au modèle une douzaine de traductions
déjà validées comme exemples, prélevées régulièrement sur tout le fichier
plutôt que prises au début. Sans ça, chaque session produit un anglais
correct mais légèrement différent, et le registre dérive au fil des mois.

**La mise en page des JSON est préservée.** L'outil modifie les fichiers ligne
par ligne plutôt que via `JSON.stringify`, qui réordonnerait les clés et
supprimerait les lignes vides de regroupement. Contrainte : une clé par
ligne, ce qui est déjà le format en place. Avant d'écrire, le résultat est
reparsé ; s'il n'est pas un JSON valide, rien n'est écrit.

### Ce que l'outil ne fait pas

- Il ne supprime pas les clés orphelines (présentes en anglais, absentes en
  français). Les signaler suffit : les effacer automatiquement supprimerait
  une traduction sans filet.
- Il ne touche jamais `fr.json`.
- Il ignore les clés commençant par `_` (`_comment`), qui ne sont pas du
  contenu affiché.
