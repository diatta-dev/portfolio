/* ============================================================
   THEME.JS : sélecteur de thème de la barre de statut.

   Trois états cycliques : auto → clair → sombre → auto.

   Pourquoi trois et pas une simple bascule : un visiteur dont
   l'OS est en sombre, qui essaie le clair, doit pouvoir revenir
   au comportement automatique. Avec deux états il resterait
   coincé sur un choix explicite qui ne suivrait plus jamais son
   système.

   Ce fichier ne gère QUE l'interaction. L'état initial est déjà
   posé par le script inline du <head> de index.html, avant le
   premier rendu : sans lui, un visiteur en thème sombre verrait
   le thème clair clignoter quelques dizaines de millisecondes.
   C'est aussi pour ça que ce fichier peut être chargé en defer
   comme les autres.

   Le rendu lui-même est entièrement dans css/variables.css :
   ici on ne fait que poser (ou retirer) data-theme sur <html>.
   ============================================================ */

(function initTheme() {
  const button = document.querySelector(".theme-toggle");
  if (!button) return;

  const root = document.documentElement;
  const label = button.querySelector(".theme-txt");
  const icon = button.querySelector(".theme-ico");
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const ORDER = ["auto", "light", "dark"];

  /* Les couleurs de la barre d'adresse mobile. Elles doivent suivre
     --bg ; elles sont écrites en dur parce qu'une balise <meta> ne
     sait pas lire une custom property. À garder synchronisées avec
     --bg et --d-bg dans css/variables.css. */
  const BAR = { light: "#f4fbfa", dark: "#0f1f2b" };

  /* Trois pictogrammes : cercle mi-plein (auto), soleil, lune. */
  const ICONS = {
    auto: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/>',
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
    auto:  { short: "auto",   long: "Thème : automatique" },
    light: { short: "clair",  long: "Thème : clair" },
    dark:  { short: "sombre", long: "Thème : sombre" }
  };

  /* L'état courant se lit sur <html>, pas dans une variable locale :
     le script inline du <head> l'a déjà posé, et c'est la seule
     source de vérité que le CSS regarde. */
  function current() {
    const value = root.dataset.theme;
    return value === "light" || value === "dark" ? value : "auto";
  }

  /* Ce que le visiteur voit RÉELLEMENT, une fois « auto » résolu. */
  function effective(state) {
    if (state === "auto") return media.matches ? "dark" : "light";
    return state;
  }

  function paint(state) {
    /* Les transitions sont coupées le temps de l'échange : sans cela
       chaque règle qui transitionne une couleur issue des variables
       se met à animer, et la bascule part en pluie de repaints.
       Voir le commentaire de .theme-swap dans css/base.css.

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

    if (state === "auto") {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = state;
    }

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
    if (meta) meta.content = BAR[effective(state)];
  }

  function store(state) {
    try {
      if (state === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", state);
    } catch (e) {
      /* navigation privée : le choix ne survivra pas à la session,
         mais la bascule fonctionne pour la visite en cours */
    }
  }

  /* Reprise de main sur le gestionnaire précoce du <head>.
     Celui-ci rend le bouton opérant dès la première frame, bien
     avant que ce fichier soit exécutable (mesuré : 609 ms en 4G
     bridée, 3221 ms sur un lien lent). Il DOIT être retiré ici :
     laissé en place, les deux gestionnaires répondraient au même
     clic et le thème avancerait de deux crans.

     Rien à reprendre par ailleurs : l'état vit sur data-theme, que
     current() lit juste en dessous, et le paint(current()) final
     de ce fichier réétiquette le bouton avec les traductions que
     le script du <head> n'a pas. */
  if (typeof window.__themeEarlyOff === "function") window.__themeEarlyOff();

  button.addEventListener("click", () => {
    const next = ORDER[(ORDER.indexOf(current()) + 1) % ORDER.length];
    store(next);
    paint(next);
  });

  /* En « auto », un changement de thème système se répercute en
     direct, sans rechargement. Le CSS bascule tout seul (la règle
     @media), il ne reste que la barre d'adresse et le libellé. */
  const onSystemChange = () => { if (current() === "auto") paint("auto"); };
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onSystemChange);
  } else if (typeof media.addListener === "function") {
    media.addListener(onSystemChange); // Safari < 14
  }

  document.addEventListener("i18n:changed", () => paint(current()));

  paint(current());
})();
