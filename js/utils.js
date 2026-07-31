/* ============================================================
   UTILS.JS — les quelques fonctions partagées par les autres
   scripts. Pas de logique métier ici, pas d'effet de bord au
   chargement : ce fichier ne fait qu'exposer window.PortfolioUtils.

   Il doit être chargé AVANT gallery.js, media.js et i18n.js
   (l'ordre des <script defer> en bas de index.html suffit :
   defer garantit l'exécution dans l'ordre de déclaration).

   exists() vivait dans media.js. Elle sert maintenant à deux
   endroits (le CV et les captures des galeries), d'où le
   déménagement : une seule implémentation à corriger le jour où
   la sonde doit évoluer.
   ============================================================ */

(function initUtils() {
  /* La sonde HEAD n'est possible qu'en http(s). Ouvert en file://,
     le navigateur refuse ces requêtes — on le sait à l'avance
     plutôt que de collectionner des exceptions. */
  const canProbe = location.protocol === "http:" || location.protocol === "https:";

  /* Renvoie true si le fichier existe, false s'il manque, null si
     on n'a pas pu savoir (file://, réseau coupé, serveur qui refuse
     les HEAD). Le null est important : dans le doute, on n'enlève
     rien au visiteur — c'est l'affichage qui se rattrapera (onerror
     sur l'image, erreur de téléchargement sur le CV). */
  async function exists(url) {
    if (!canProbe) return null;
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch (err) {
      return null;
    }
  }

  /* Découpe une liste d'attribut data-* et retire les vides.
     Utilisée pour data-shots (séparateur « , ») et data-alts
     (séparateur « | »). */
  function splitList(value, separator) {
    return String(value || "")
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  window.PortfolioUtils = { canProbe, exists, splitList };
})();
