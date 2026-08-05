/* ============================================================
   THEME.JS : sélecteur de thème de la barre de statut.

   Une bascule, deux états visibles : clair ⇄ sombre.

   « Auto » n'a pas disparu, il a cessé d'être un choix à proposer.
   Tant que le visiteur n'a rien décidé, le thème suit celui de
   l'appareil, en direct : data-theme-source vaut "system" et tout
   changement de réglage de l'OS réécrit data-theme sans recharger
   la page. Le premier clic sur le bouton fait passer la source à
   "user" et fige le choix, jusqu'à effacement du stockage local.

   Pourquoi ne plus l'exposer : c'était un troisième cran de cycle
   dont le libellé (« auto ») décrivait un mécanisme, pas un
   résultat. Sur mobile, où layout.css masque le mot et ne laisse
   que le pictogramme, le cercle mi-plein de l'auto ne se
   distinguait ni du soleil ni de la lune, et il fallait deux clics
   pour aller du clair au sombre. Le prix payé : on ne peut plus
   revenir au suivi automatique depuis l'interface.

   ── data-theme est TOUJOURS renseigné ──
   C'est le second effet de ce changement, et le plus important.
   L'ancien état auto se signalait par l'ABSENCE d'attribut, et le
   thème sombre s'atteignait alors par une seconde règle CSS,
   @media (prefers-color-scheme: dark) + :root:not([data-theme=…]).
   Deux chemins pour un même rendu, dont un :not() sous media query
   (le suspect H2 du banc diagnostic.html). En écrivant toujours
   light ou dark, il n'en reste qu'un.

   Ce fichier ne gère QUE l'interaction. L'état initial est déjà
   posé par le script inline du <head> de index.html, avant le
   premier rendu : sans lui, un visiteur en thème sombre verrait
   le thème clair clignoter quelques dizaines de millisecondes.
   C'est aussi pour ça que ce fichier peut être chargé en defer
   comme les autres.

   Le rendu lui-même est entièrement dans css/variables.css :
   ici on ne fait que poser data-theme sur <html>.
   ============================================================ */

(function initTheme() {
  const button = document.querySelector(".theme-toggle");
  if (!button) return;

  const root = document.documentElement;
  const label = button.querySelector(".theme-txt");
  const icon = button.querySelector(".theme-ico");
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  /* Les couleurs de la barre d'adresse mobile. Elles doivent suivre
     --bg ; elles sont écrites en dur parce qu'une balise <meta> ne
     sait pas lire une custom property. À garder synchronisées avec
     --bg et --d-bg dans css/variables.css. */
  const BAR = { light: "#f4fbfa", dark: "#0f1f2b" };

  /* Deux pictogrammes : soleil, lune. */
  const ICONS = {
    light:
      '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2' +
      'M6.5 6.5 4.9 4.9M19.1 19.1l-1.6-1.6M17.5 6.5l1.6-1.6M4.9 19.1l1.6-1.6"/>',
    dark: '<path d="M20 13.4A8.2 8.2 0 1 1 10.6 4a6.6 6.6 0 0 0 9.4 9.4Z"/>'
  };

  function t(key, fallback) {
    const i18n = window.PortfolioI18n;
    return i18n && typeof i18n.t === "function" ? i18n.t(key, fallback) : fallback;
  }

  const FALLBACK = {
    light: { short: "clair", long: "Thème : clair" },
    dark: { short: "sombre", long: "Thème : sombre" }
  };

  /* L'état courant se lit sur <html>, pas dans une variable locale :
     le script inline du <head> l'a déjà posé, et c'est la seule
     source de vérité que le CSS regarde. Le repli sur "light" ne
     devrait jamais servir : il couvre le cas où l'attribut aurait
     été effacé par une extension ou un outil de développement. */
  function current() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }

  /* "system" tant que le visiteur n'a pas tranché lui-même. */
  function follows() {
    return root.dataset.themeSource !== "user";
  }

  function paint(state) {
    /* Les transitions sont coupées, et les surfaces en verre forcées
       à reprendre leur instantané d'arrière-plan, le temps de
       l'échange. Sans cela : d'un côté chaque règle qui transitionne
       une couleur issue des variables se met à animer et la bascule
       part en pluie de repaints ; de l'autre les cartes en
       backdrop-filter restent peintes dans l'ancien thème jusqu'au
       premier défilement. Voir le commentaire de .theme-swap dans
       css/base.css.

       Deux précautions, l'une et l'autre mesurées :

       · on ne coupe que si le thème change RÉELLEMENT. paint() est
         aussi appelée au changement de langue, pour réétiqueter le
         bouton ; y ajouter le moindre travail ralentit une bascule
         qui n'a pourtant aucune couleur à échanger.

       · le retrait passe par deux requestAnimationFrame et non par
         une lecture de offsetWidth. Forcer le recalcul à la main
         déplace simplement le coût dans le gestionnaire de clic
         (mesuré : 1,7 ms de script qui deviennent 28 à 57 ms). Le
         double rAF laisse la frame se peindre d'abord. */
    const swapping = current() !== state;
    if (swapping) root.classList.add("theme-swap");

    root.dataset.theme = state;

    if (swapping) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          root.classList.remove("theme-swap");
        });
      });
    }

    const short = t("theme." + state + ".short", FALLBACK[state].short);
    const long = t("theme." + state + ".long", FALLBACK[state].long);

    if (label) label.textContent = short;
    button.setAttribute("aria-label", long);
    button.setAttribute("title", long);

    if (icon) {
      icon.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
        'stroke-linecap="round" stroke-linejoin="round" focusable="false">' +
        ICONS[state] + "</svg>";
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = BAR[state];
  }

  /* Reprise de main sur le gestionnaire précoce du <head>.
     Celui-ci rend le bouton opérant dès la première frame, bien
     avant que ce fichier soit exécutable (mesuré : 609 ms en 4G
     bridée, 3221 ms sur un lien lent). Il DOIT être retiré ici :
     laissé en place, les deux gestionnaires répondraient au même
     clic, le thème ferait deux bascules et reviendrait à son point
     de départ : le bouton paraîtrait mort.

     Rien à reprendre par ailleurs : l'état vit sur data-theme et
     data-theme-source, que current() et follows() lisent juste
     au-dessus, et le paint(current()) final de ce fichier
     réétiquette le bouton avec les traductions que le script du
     <head> n'a pas. */
  if (typeof window.__themeEarlyOff === "function") window.__themeEarlyOff();

  button.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    /* La source passe à "user" AVANT le paint : à partir d'ici, un
       changement de thème système ne doit plus rien écraser. */
    root.dataset.themeSource = "user";
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      /* navigation privée : le choix ne survivra pas à la session,
         mais la bascule fonctionne pour la visite en cours */
    }
    paint(next);
  });

  /* Tant que le visiteur n'a rien choisi, changer le thème de son
     appareil change celui de la page, en direct et sans rechargement.
     C'est ici que ça se joue désormais, et plus dans une media query
     CSS : data-theme portant toujours une valeur explicite, c'est
     nous qui devons la réécrire. */
  const onSystemChange = () => { if (follows()) paint(media.matches ? "dark" : "light"); };
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onSystemChange);
  } else if (typeof media.addListener === "function") {
    media.addListener(onSystemChange); // Safari < 14
  }

  document.addEventListener("i18n:changed", () => paint(current()));

  paint(current());
})();
