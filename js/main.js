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

if (window.PortfolioAnimations) {
  window.PortfolioAnimations.init();
}
