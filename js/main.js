/* ============================================================
   MAIN.JS : point d'entrée du site.
   Initialise le fallback de la photo de profil (résilience si
   la photo est absente ou invalide), puis démarre les animations
   définies dans animations.js.
   Chargé en fin de body, avec defer, après animations.js.
   ============================================================ */

(function initPhotoFallback() {
  const photo = document.querySelector(".profile-photo");
  if (!photo) return;

  const fallbackSrc = photo.dataset.fallbackSrc;
  const applyFallback = () => {
    if (fallbackSrc && photo.src !== fallbackSrc) {
      photo.src = fallbackSrc;
    }
  };

  photo.addEventListener("error", applyFallback, { once: true });

  if (photo.complete) {
    if (!photo.naturalWidth) applyFallback();
  } else {
    photo.addEventListener("load", () => {
      if (!photo.naturalWidth) applyFallback();
    }, { once: true });
  }
})();

/* ============================================================
   Navigation défilante : signaler qu'il reste des liens.

   Sous 420 px la barre tient sur une ligne et la navigation défile
   dans la place qui reste (194 px à 320 px, pour 375 px de liens).
   Rien ne l'indiquait : le dernier lien visible était tranché net
   au bord, ce qui se lit comme un défaut d'affichage et non comme
   une invitation à faire glisser.

   Le dégradé est posé par CSS, mais seulement quand il y a vraiment
   quelque chose à révéler : appliqué en permanence, il estomperait
   le dernier lien alors même que tout tient. D'où cette classe, que
   le CSS seul ne peut pas décider (aucun sélecteur ne teste le
   débordement).

   ResizeObserver plutôt qu'un écouteur de resize : la largeur des
   liens change aussi au changement de langue, sans que la fenêtre
   ne bouge.
   ============================================================ */
(function initNavOverflow() {
  const nav = document.querySelector(".statusbar nav");
  if (!nav) return;

  const update = () => {
    /* 1 px de tolérance : les largeurs sont fractionnaires et
       scrollWidth est arrondi à l'entier supérieur. */
    nav.classList.toggle("is-overflowing", nav.scrollWidth > nav.clientWidth + 1);
  };

  update();

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    /* les liens eux-mêmes : c'est leur largeur qui change avec la
       langue, pas celle de la barre */
    nav.querySelectorAll("a").forEach((link) => observer.observe(link));
  } else {
    window.addEventListener("resize", update);
  }
})();

/* ============================================================
   Menu de navigation replie (bouton hamburger).

   Le repli lui-meme est entierement CSS (layout.css, seuil 680 px) ;
   ce script ne fait que porter l'etat. Il tient dans un seul
   attribut, aria-expanded sur le bouton, double par une classe sur
   la barre parce qu'aucun selecteur ne permet de styler un frere
   precedent depuis le bouton.

   Le nom accessible du bouton ne change pas a l'ouverture : c'est
   aria-expanded qui porte l'etat. Un libelle « Fermer le menu » se
   ferait ecraser au premier changement de langue, i18n.js
   reappliquant la valeur de data-i18n-attr.

   Le panneau se referme sur un lien, sur Echap, sur un clic
   exterieur, et au passage en grand ecran. Les trois premiers sont
   des attentes de base ; le quatrieme evite un aria-expanded reste
   a true devant une navigation redevenue visible en clair.
   ============================================================ */
(function initNavMenu() {
  const toggle = document.querySelector(".nav-toggle");
  const bar = document.querySelector(".statusbar");
  if (!toggle || !bar) return;

  const nav = document.getElementById(toggle.getAttribute("aria-controls"));
  if (!nav) return;

  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

  function open() {
    toggle.setAttribute("aria-expanded", "true");
    bar.classList.add("nav-open");
  }

  /* focusBack : rendre la main au bouton n'a de sens que si la
     fermeture vient du clavier. Apres un clic exterieur, deplacer le
     focus deroberait celui que l'utilisateur vient de poser. */
  function close(focusBack) {
    if (!isOpen()) return;
    toggle.setAttribute("aria-expanded", "false");
    bar.classList.remove("nav-open");
    if (focusBack) toggle.focus();
  }

  toggle.addEventListener("click", () => (isOpen() ? close(false) : open()));

  /* Un lien de la barre pointe vers une ancre de la meme page : sans
     cette fermeture, le panneau resterait ouvert par-dessus la
     section qu'on vient de demander. */
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) close(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close(true);
  });

  document.addEventListener("click", (event) => {
    if (!isOpen()) return;
    if (nav.contains(event.target) || toggle.contains(event.target)) return;
    close(false);
  });

  /* Le seuil est repete ici et dans layout.css. Il n'y a pas de
     moyen de le lire depuis la feuille sans le coder en dur d'un
     cote ou de l'autre ; les deux occurrences sont commentees. */
  const wide = window.matchMedia("(min-width:681px)");
  const onChange = () => { if (wide.matches) close(false); };
  if (typeof wide.addEventListener === "function") {
    wide.addEventListener("change", onChange);
  } else {
    wide.addListener(onChange);
  }
})();

/* L'appel à PortfolioAnimations.init() vivait ici. Il est passé à la
   fin de js/animations.js : main.js s'exécute désormais AVANT lui
   (voir l'ordre des <script> dans index.html), et le garde
   `if (window.PortfolioAnimations)` serait donc toujours faux. Un
   garde qui protège d'une erreur en supprimant silencieusement la
   fonctionnalité est pire que l'erreur. */
