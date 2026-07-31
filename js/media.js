/* ============================================================
   MEDIA.JS — vidéos de démonstration des projets et CV.

   Deux fichiers que le site attend mais qui n'existent pas
   forcément encore :
     · assets/videos/<projet>.mp4  (+ .jpg en vignette, facultatif)
     · assets/cv-elhadji-diatta.pdf

   Plutôt que d'afficher un lecteur cassé ou d'envoyer le visiteur
   sur une 404, on vérifie la présence du fichier avant de proposer
   le bouton. La vérification se fait par une requête HEAD, donc
   uniquement en http(s) : ouvert en file://, le navigateur refuse
   ces requêtes, on garde alors le bouton actif et c'est l'erreur
   de lecture qui prend le relais.

   Conséquence pratique : il suffit de déposer le fichier au bon
   endroit, rien à modifier dans le HTML.
   ============================================================ */

(function initMedia() {
  const canProbe = location.protocol === "http:" || location.protocol === "https:";

  /* Renvoie true si le fichier existe, false s'il manque, null si
     on n'a pas pu savoir (file://, réseau coupé, serveur qui refuse
     les HEAD). Le null est important : dans le doute, on n'enlève
     rien au visiteur. */
  async function exists(url) {
    if (!canProbe) return null;
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch (err) {
      return null;
    }
  }

  /* ---------- 1. vidéos de démonstration ---------- */
  function initProjectVideos() {
    document.querySelectorAll(".project-media").forEach(async (figure) => {
      const src = (figure.dataset.video || "").trim();
      const poster = (figure.dataset.poster || "").trim();
      const button = figure.querySelector(".media-play");
      if (!button) return;

      if (!src) {
        markEmpty(figure, button);
        return;
      }

      // la vignette est facultative : sans elle, le bouton s'affiche
      // sur le fond de verre de la carte
      if (poster && (await exists(poster)) !== false) {
        figure.style.backgroundImage = 'url("' + poster + '")';
        figure.classList.add("has-poster");
      }

      if ((await exists(src)) === false) {
        markEmpty(figure, button);
        return;
      }

      button.addEventListener("click", () => play(figure, src), { once: true });
    });
  }

  function markEmpty(figure, button) {
    figure.classList.add("is-empty");
    button.disabled = true;
    const label = button.querySelector(".media-txt");
    if (label) label.textContent = "démo vidéo à venir";
  }

  function play(figure, src) {
    const video = document.createElement("video");
    video.className = "media-video";
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "metadata";
    if (figure.dataset.poster) video.poster = figure.dataset.poster;

    // le fichier a disparu entre la vérification et le clic, ou le
    // navigateur ne sait pas lire ce codec : on le dit, on ne laisse
    // pas un rectangle noir
    video.addEventListener("error", () => {
      figure.classList.remove("is-playing"); // sinon le cadre garde le fond noir du lecteur
      figure.classList.add("is-empty");
      figure.style.backgroundImage = "";
      figure.innerHTML = '<p class="media-empty">vidéo indisponible pour le moment</p>';
    });

    figure.classList.add("is-playing");
    figure.innerHTML = "";
    figure.appendChild(video);
  }

  /* ---------- 2. téléchargement du CV ---------- */
  function initCvLinks() {
    const links = Array.from(document.querySelectorAll("[data-cv]"));
    if (!links.length) return;

    const href = links[0].getAttribute("href");

    exists(href).then((found) => {
      if (found !== false) return; // présent, ou impossible à vérifier

      links.forEach((link) => {
        link.classList.add("is-missing");
        link.setAttribute("aria-disabled", "true");
        link.setAttribute("title", "CV bientôt disponible");
        link.addEventListener("click", (event) => {
          event.preventDefault();
          notify(link, "CV bientôt disponible — écrivez-moi, je vous l'envoie.");
        });
      });
    });
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

  initProjectVideos();
  initCvLinks();
})();
