/* ============================================================
   MEDIA.JS : téléchargement du CV.

   Ce fichier gérait aussi les vidéos de démonstration des projets.
   Elles ont été remplacées par des galeries de captures : voir
   js/gallery.js. La sonde exists(), qui servait aux deux, vit
   maintenant dans js/utils.js.

   Le principe n'a pas changé : le site attend un fichier qui
   n'existe pas forcément encore. Plutôt que d'envoyer le visiteur
   sur une 404, on vérifie sa présence par une requête HEAD avant
   de laisser le bouton actif. Il suffit donc de déposer le PDF au
   bon endroit, sans rien modifier dans le HTML.

   ── Le CV suit la langue ────────────────────────────────────
     français : assets/cv-elhadji-diatta.pdf
     anglais  : assets/cv-elhadji-diatta-en.pdf

   Si la version anglaise n'existe pas, on RETOMBE sur la
   française plutôt que de neutraliser le bouton : un CV en
   français vaut infiniment mieux que pas de CV du tout. En
   revanche, servir un CV français derrière une interface anglaise
   sans l'avoir cherché serait pire que ne pas traduire, d'où la
   tentative dans l'ordre.
   ============================================================ */

(function initMedia() {
  const links = Array.from(document.querySelectorAll("[data-cv]"));
  if (!links.length) return;

  const utils = window.PortfolioUtils;
  if (!utils) return;

  const BASE = "assets/cv-elhadji-diatta";
  const FR = { href: BASE + ".pdf", name: "CV-Elhadji-Diatta.pdf" };
  const EN = { href: BASE + "-en.pdf", name: "CV-Elhadji-Diatta-EN.pdf" };

  function t(key, fallback) {
    const i18n = window.PortfolioI18n;
    return i18n && typeof i18n.t === "function" ? i18n.t(key, fallback) : fallback;
  }

  /* Renvoie la meilleure version disponible pour la langue donnée. */
  async function resolve(lang) {
    if (lang === "en") {
      // null = impossible à vérifier → on tente, l'erreur de
      // téléchargement prendra le relais si le fichier manque
      if ((await utils.exists(EN.href)) !== false) return EN;
    }
    if ((await utils.exists(FR.href)) !== false) return FR;
    return null;
  }

  function enable(link, file) {
    link.classList.remove("is-missing");
    link.removeAttribute("aria-disabled");
    link.removeAttribute("title");
    link.setAttribute("href", file.href);
    link.setAttribute("download", file.name);
    if (link._blocker) {
      link.removeEventListener("click", link._blocker);
      link._blocker = null;
    }
  }

  function disable(link) {
    link.classList.add("is-missing");
    link.setAttribute("aria-disabled", "true");
    link.setAttribute("title", t("cv.missing.title", "CV bientôt disponible"));

    if (link._blocker) return;
    link._blocker = (event) => {
      event.preventDefault();
      notify(link, t("cv.missing.note", "CV bientôt disponible : écrivez-moi, je vous l'envoie."));
    };
    link.addEventListener("click", link._blocker);
  }

  /* message posé à côté du lien, retiré au bout de 5 s */
  function notify(link, message) {
    const host = link.closest(".hero-actions") || link.closest(".social") || link.parentNode;
    let note = host.querySelector(".cv-note");

    if (!note) {
      note = document.createElement("p");
      note.className = "cv-note";
      note.setAttribute("role", "status");
      host.appendChild(note);
    }

    note.textContent = message;
    clearTimeout(note._timer);
    note._timer = setTimeout(() => note.remove(), 5000);
  }

  function sync() {
    const lang = document.documentElement.lang === "en" ? "en" : "fr";
    resolve(lang).then((file) => {
      links.forEach((link) => (file ? enable(link, file) : disable(link)));
    });
  }

  document.addEventListener("i18n:changed", sync);
  sync();
})();
