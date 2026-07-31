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

if (window.PortfolioAnimations) {
  window.PortfolioAnimations.init();
}
