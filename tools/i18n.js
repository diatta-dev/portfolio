#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   I18N.JS : synchronisation fr -> en.

   Trois fichiers, trois rôles :
     i18n/fr.json      source de vérité, éditée à la main
     i18n/en.json      traduction, éditable à la main aussi
     i18n/.sync.json   empreintes, écrites par cet outil, jamais éditées

   .sync.json retient l'empreinte SHA-256 de la valeur française telle
   qu'elle était quand l'anglais a été validé. Si le français change
   ensuite, l'empreinte ne correspond plus et la clé est signalée comme
   périmée. C'est ce qui distingue « jamais traduit » de « traduit, puis
   modifié côté français », le second cas étant celui qui passe
   inaperçu autrement.

   Usage :
     node tools/i18n.js check       état des lieux, code 1 si désynchronisé
     node tools/i18n.js translate   traduit les clés manquantes/périmées
     node tools/i18n.js accept      enregistre l'état actuel comme référence

   « translate » a besoin d'une clé API dans l'environnement :
     export ANTHROPIC_API_KEY=sk-ant-...
   ou, après un `ant auth login` :
     export ANTHROPIC_AUTH_TOKEN=$(ant auth print-credentials --access-token)

   Les fichiers JSON sont modifiés ligne par ligne, jamais via
   JSON.stringify : celui-ci réordonnerait les clés et supprimerait les
   lignes vides de regroupement. Contrainte : une clé par ligne, ce qui
   est déjà le format en place.
   ══════════════════════════════════════════════════════════════ */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RACINE = path.resolve(__dirname, "..");
const FR = path.join(RACINE, "i18n", "fr.json");
const EN = path.join(RACINE, "i18n", "en.json");
const SYNC = path.join(RACINE, "i18n", ".sync.json");

const MODELE = "claude-opus-5";
const EFFORT = "medium"; // low pour aller plus vite, high si le ton dérive
const EXEMPLES = 12; // traductions déjà validées envoyées en exemple

/* ---------- lecture ligne par ligne ---------- */

/* Une ligne « "clé": "valeur", » du JSON. Les échappements (\" \\ \n)
   sont laissés tels quels dans `brut` et décodés dans `valeur`. */
const LIGNE = /^(\s*)("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*")\s*(,?)\s*$/;

function lire(fichier) {
  const lignes = fs.readFileSync(fichier, "utf8").split("\n");
  const entrees = new Map(); // clé -> { index, indent, virgule }
  const ordre = [];

  lignes.forEach((ligne, index) => {
    const m = LIGNE.exec(ligne);
    if (!m) return;
    const cle = JSON.parse(m[2]);
    entrees.set(cle, {
      index,
      indent: m[1],
      valeur: JSON.parse(m[3]),
      virgule: m[4] === ","
    });
    ordre.push(cle);
  });

  return { lignes, entrees, ordre };
}

/* Écrit le fichier après deux garde-fous. Une insertion en fin d'objet
   peut laisser une virgule sur la dernière propriété, et un JSON cassé
   rend le site muet en anglais : mieux vaut ne rien écrire du tout. */
function ecrire(chemin, fichier) {
  let dernier = -1;
  for (let i = 0; i < fichier.lignes.length; i += 1) {
    if (LIGNE.test(fichier.lignes[i])) dernier = i;
  }
  if (dernier >= 0) fichier.lignes[dernier] = fichier.lignes[dernier].replace(/,\s*$/, "");

  const texte = fichier.lignes.join("\n");
  try {
    JSON.parse(texte);
  } catch (e) {
    throw new Error(
      "le résultat ne serait pas un JSON valide (" + e.message + "), " + chemin + " est laissé intact."
    );
  }
  fs.writeFileSync(chemin, texte, "utf8");
}

/* Remplace la valeur d'une clé existante, en préservant l'indentation
   et la virgule finale. */
function remplacer(fichier, cle, valeur) {
  const e = fichier.entrees.get(cle);
  fichier.lignes[e.index] =
    e.indent + JSON.stringify(cle) + ": " + JSON.stringify(valeur) + (e.virgule ? "," : "");
  e.valeur = valeur;
}

/* Insère une clé absente à la position qu'elle occupe dans le fichier
   de référence, pour que les deux fichiers restent lisibles côte à côte.
   Les décalages d'index sont recalculés à chaque insertion. */
function inserer(fichier, cle, valeur, apres) {
  const ancre = apres !== null ? fichier.entrees.get(apres) : null;
  const index = ancre ? ancre.index : trouverAccolade(fichier.lignes);
  const indent = ancre ? ancre.indent : "  ";

  // la nouvelle ligne hérite de la virgule de l'ancre ; si l'ancre était
  // la dernière propriété (pas de virgule), elle en gagne une.
  let virgule = true;
  if (ancre && !ancre.virgule) {
    fichier.lignes[ancre.index] += ",";
    ancre.virgule = true;
    virgule = false;
  }

  const ligne = indent + JSON.stringify(cle) + ": " + JSON.stringify(valeur) + (virgule ? "," : "");
  fichier.lignes.splice(index + 1, 0, ligne);

  for (const e of fichier.entrees.values()) if (e.index > index) e.index += 1;
  fichier.entrees.set(cle, { index: index + 1, indent, valeur, virgule });
}

function trouverAccolade(lignes) {
  for (let i = 0; i < lignes.length; i += 1) if (lignes[i].trim() === "{") return i;
  return 0;
}

/* ---------- état de synchronisation ---------- */

function empreinte(texte) {
  return crypto.createHash("sha256").update(texte, "utf8").digest("hex").slice(0, 16);
}

function traduisible(cle) {
  return cle.charAt(0) !== "_"; // _comment et consorts ne sont pas du contenu
}

function lireSync() {
  if (!fs.existsSync(SYNC)) return {};
  try {
    return JSON.parse(fs.readFileSync(SYNC, "utf8"));
  } catch (e) {
    console.error("i18n : " + SYNC + " est illisible, il sera reconstruit.");
    return {};
  }
}

function ecrireSync(sync) {
  const cles = Object.keys(sync).sort();
  const corps = cles.map((k) => "  " + JSON.stringify(k) + ": " + JSON.stringify(sync[k]));
  fs.writeFileSync(SYNC, "{\n" + corps.join(",\n") + "\n}\n", "utf8");
}

function etat() {
  const fr = lire(FR);
  const en = lire(EN);
  const sync = lireSync();

  const manquantes = []; // dans fr, absentes de en
  const perimees = []; // le français a changé depuis la validation
  const orphelines = []; // dans en, absentes de fr

  for (const cle of fr.ordre) {
    if (!traduisible(cle)) continue;
    if (!en.entrees.has(cle)) {
      manquantes.push(cle);
      continue;
    }
    if (sync[cle] !== empreinte(fr.entrees.get(cle).valeur)) perimees.push(cle);
  }
  for (const cle of en.ordre) {
    if (!traduisible(cle)) continue;
    if (!fr.entrees.has(cle)) orphelines.push(cle);
  }

  return { fr, en, sync, manquantes, perimees, orphelines };
}

/* ---------- commande : check ---------- */

function check() {
  const s = etat();
  const nFr = s.fr.ordre.filter(traduisible).length;
  const nEn = s.en.ordre.filter(traduisible).length;

  console.log("i18n : " + nFr + " clés fr, " + nEn + " clés en");

  const bloc = (titre, liste) => {
    if (!liste.length) return;
    console.log("");
    console.log("  " + liste.length + " " + titre);
    liste.forEach((cle) => console.log("    " + cle));
  };

  bloc("manquante(s) : jamais traduite(s)", s.manquantes);
  bloc("périmée(s) : le français a changé", s.perimees);
  bloc("orpheline(s) : absente(s) de fr.json", s.orphelines);

  const total = s.manquantes.length + s.perimees.length + s.orphelines.length;
  if (total === 0) {
    console.log("");
    console.log("  à jour.");
    return 0;
  }
  if (s.orphelines.length) {
    console.log("");
    console.log("  Les orphelines se retirent à la main : les supprimer");
    console.log("  automatiquement effacerait une traduction sans filet.");
  }
  return 1;
}

/* ---------- commande : accept ---------- */

function accept() {
  const s = etat();
  const sync = {};
  let ignorees = 0;

  for (const cle of s.fr.ordre) {
    if (!traduisible(cle)) continue;
    if (!s.en.entrees.has(cle)) {
      ignorees += 1;
      continue;
    }
    sync[cle] = empreinte(s.fr.entrees.get(cle).valeur);
  }

  ecrireSync(sync);
  console.log("i18n : " + Object.keys(sync).length + " clés enregistrées comme à jour.");
  if (ignorees) {
    console.log("  " + ignorees + " clé(s) sans traduction anglaise, non enregistrée(s).");
    console.log("  Lancer : node tools/i18n.js translate");
  }
  return 0;
}

/* ---------- commande : translate ---------- */

/* Une douzaine de traductions déjà validées, réparties sur tout le
   fichier. Sans ces exemples, chaque session produit un anglais correct
   mais légèrement différent, et le registre dérive au fil des mois. */
function choisirExemples(s, aTraduire) {
  const exclus = new Set(aTraduire);
  const candidats = s.fr.ordre.filter((cle) => {
    if (!traduisible(cle) || exclus.has(cle)) return false;
    if (!s.en.entrees.has(cle)) return false;
    if (s.sync[cle] !== empreinte(s.fr.entrees.get(cle).valeur)) return false;
    const n = s.fr.entrees.get(cle).valeur.length;
    return n >= 25 && n <= 400;
  });

  if (candidats.length <= EXEMPLES) return candidats;

  // un prélèvement régulier plutôt que les douze premières : le hero et
  // les métadonnées ne représentent pas le ton du reste du site.
  const pas = candidats.length / EXEMPLES;
  const choisis = [];
  for (let i = 0; i < EXEMPLES; i += 1) choisis.push(candidats[Math.floor(i * pas)]);
  return choisis;
}

const CONSIGNE = [
  "Tu traduis les chaînes d'interface d'un portfolio de développeur, du français vers l'anglais.",
  "",
  "Règles :",
  "- Conserve exactement le balisage HTML (<strong>, <em>...), les entités (&amp;),",
  "  les espaces insécables et les placeholders comme {name} ou {n}.",
  "- Conserve les caractères de ponctuation décoratifs déjà présents : · | → ↓ ✉ ●",
  // le caractère est échappé : le modèle le reçoit, le dépôt n'en contient pas
  "- N'introduis jamais de tiret cadratin (\u2014) : le site n'en utilise aucun.",
  "  Utilise deux-points, virgule, parenthèses ou point médian selon la fonction.",
  "- Ne traduis pas les codes de langue (fr_FR, en_US), les URL, les noms propres,",
  "  ni les noms de technologies.",
  "- « stage » au sens pipeline (stage: build) reste « stage » en anglais.",
  "  « stage » au sens professionnel devient « internship », jamais « stage ».",
  "- Typographie française vers anglaise : pas d'espace avant : ; ! ?",
  "- Reprends le registre des exemples fournis : sobre, direct, à la première personne.",
  "",
  "Réponds uniquement avec le JSON demandé."
].join("\n");

const SCHEMA = {
  type: "object",
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          en: { type: "string" }
        },
        required: ["key", "en"],
        additionalProperties: false
      }
    }
  },
  required: ["translations"],
  additionalProperties: false
};

function entetesAuth() {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (cle) return { "x-api-key": cle };

  const jeton = process.env.ANTHROPIC_AUTH_TOKEN;
  if (jeton) {
    return { authorization: "Bearer " + jeton, "anthropic-beta": "oauth-2025-04-20" };
  }

  console.error("i18n : aucune clé API.");
  console.error("  export ANTHROPIC_API_KEY=sk-ant-...");
  console.error("  ou, après un `ant auth login` :");
  console.error("  export ANTHROPIC_AUTH_TOKEN=$(ant auth print-credentials --access-token)");
  return null;
}

async function appeler(corps, entetes) {
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");

  // 429 et 5xx sont transitoires : trois essais, attente doublée.
  for (let essai = 1; essai <= 3; essai += 1) {
    const reponse = await fetch(base + "/v1/messages", {
      method: "POST",
      headers: Object.assign(
        { "content-type": "application/json", "anthropic-version": "2023-06-01" },
        entetes
      ),
      body: JSON.stringify(corps)
    });

    if (reponse.ok) return reponse.json();

    const texte = await reponse.text();
    const retentable = reponse.status === 429 || reponse.status >= 500;
    if (!retentable || essai === 3) {
      throw new Error("HTTP " + reponse.status + " : " + texte.slice(0, 500));
    }
    const attente = 2000 * Math.pow(2, essai - 1);
    console.error("  HTTP " + reponse.status + ", nouvel essai dans " + attente / 1000 + " s...");
    await new Promise((r) => setTimeout(r, attente));
  }
  throw new Error("appel impossible");
}

async function translate() {
  const s = etat();
  const aTraduire = s.manquantes.concat(s.perimees);

  if (!aTraduire.length) {
    console.log("i18n : rien à traduire.");
    if (s.orphelines.length) {
      console.log("  " + s.orphelines.length + " clé(s) orpheline(s), à retirer à la main.");
      return 1;
    }
    return 0;
  }

  const entetes = entetesAuth();
  if (!entetes) return 1;

  const exemples = choisirExemples(s, aTraduire);
  const demande = {
    examples: exemples.map((cle) => ({
      key: cle,
      fr: s.fr.entrees.get(cle).valeur,
      en: s.en.entrees.get(cle).valeur
    })),
    to_translate: aTraduire.map((cle) => ({
      key: cle,
      fr: s.fr.entrees.get(cle).valeur,
      current_en: s.en.entrees.has(cle) ? s.en.entrees.get(cle).valeur : null
    }))
  };

  console.log("i18n : " + aTraduire.length + " clé(s) à traduire, " + exemples.length + " exemple(s) de référence.");

  const donnees = await appeler(
    {
      model: MODELE,
      max_tokens: 8000,
      system: CONSIGNE,
      output_config: { effort: EFFORT, format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: JSON.stringify(demande, null, 2) }]
    },
    entetes
  );

  if (donnees.stop_reason === "refusal") {
    console.error("i18n : requête refusée par le modèle.");
    if (donnees.stop_details) console.error("  " + JSON.stringify(donnees.stop_details));
    return 1;
  }
  if (donnees.stop_reason === "max_tokens") {
    console.error("i18n : réponse tronquée. Traduire moins de clés à la fois.");
    return 1;
  }

  const bloc = (donnees.content || []).find((b) => b.type === "text");
  if (!bloc) {
    console.error("i18n : réponse sans texte exploitable.");
    return 1;
  }

  let resultat;
  try {
    resultat = JSON.parse(bloc.text);
  } catch (e) {
    console.error("i18n : réponse JSON invalide.");
    console.error(bloc.text.slice(0, 500));
    return 1;
  }

  const parCle = new Map(resultat.translations.map((t) => [t.key, t.en]));
  const absentes = aTraduire.filter((cle) => !parCle.has(cle));
  if (absentes.length) {
    console.error("i18n : le modèle n'a pas renvoyé " + absentes.length + " clé(s) : " + absentes.join(", "));
    return 1;
  }

  console.log("");
  for (const cle of aTraduire) {
    const en = parCle.get(cle);
    if (s.en.entrees.has(cle)) remplacer(s.en, cle, en);
    else inserer(s.en, cle, en, precedenteCommune(s, cle));
    s.sync[cle] = empreinte(s.fr.entrees.get(cle).valeur);

    console.log("  " + cle);
    console.log("    fr  " + s.fr.entrees.get(cle).valeur);
    console.log("    en  " + en);
    console.log("");
  }

  ecrire(EN, s.en);
  ecrireSync(s.sync);

  console.log("i18n : en.json et .sync.json mis à jour.");
  console.log("  Relire ci-dessus. Si une formulation ne convient pas :");
  console.log("  corriger en.json à la main, puis node tools/i18n.js accept");
  return 0;
}

/* La clé qui précède `cle` dans fr.json et qui existe déjà dans en.json :
   c'est le point d'insertion qui respecte le regroupement du fichier. */
function precedenteCommune(s, cle) {
  for (let i = s.fr.ordre.indexOf(cle) - 1; i >= 0; i -= 1) {
    const precedente = s.fr.ordre[i];
    if (s.en.entrees.has(precedente)) return precedente;
  }
  return null;
}

/* ---------- entrée ---------- */

const COMMANDES = { check, accept, translate };

async function main() {
  const commande = process.argv[2];
  if (!COMMANDES[commande]) {
    console.error("usage : node tools/i18n.js check | translate | accept");
    process.exit(2);
  }
  try {
    process.exit(await COMMANDES[commande]());
  } catch (e) {
    console.error("i18n : " + e.message);
    process.exit(1);
  }
}

main();
