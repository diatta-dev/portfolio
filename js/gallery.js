/* ============================================================
   GALLERY.JS : galeries de captures d'écran des cartes projet.

   Remplace les anciennes vidéos de démonstration : des captures
   pèsent cent fois moins lourd, se lisent d'un coup d'œil, et ne
   demandent au visiteur ni clic ni son.

   ── Ce que le HTML fournit ──────────────────────────────────
     <figure class="project-gallery"
             data-shots="a.webp,b.webp"          chemins, dans l'ordre
             data-alts="Vue A|Vue B"             descriptions, MÊME ordre
             data-i18n-alts="shots.judicial">    préfixe de clés i18n
       <p class="gallery-empty">captures à venir</p>
     </figure>

   Le <p class="gallery-empty"> est le repli présent dans le HTML.
   Il reste affiché tel quel si le JS ne tourne pas, si data-shots
   est vide, ou si AUCUNE capture n'a été trouvée sur le serveur.
   Le JS ne le remplace qu'une fois sûr d'avoir quelque chose à
   montrer : jamais de cadre vide, jamais d'image cassée.

   ── Le défilement ───────────────────────────────────────────
   Automatique, 4,5 s. Il se met en pause au survol, quand le
   focus clavier entre dans la galerie, quand l'onglet passe en
   arrière-plan, et quand la galerie sort de l'écran.

   Dès que le visiteur touche une flèche, une pastille, une
   touche ou l'écran, l'automatique s'arrête DÉFINITIVEMENT pour
   cette galerie. Il a pris la main, on la lui laisse : reprendre
   le défilement contre lui est le défaut classique de ces
   composants : on regarde une capture, elle s'échappe.

   ── Pourquoi pas GSAP ───────────────────────────────────────
   La transition est en CSS (opacity + translateX, 400 ms). Le
   composant doit rester utilisable même si GSAP échoue à charger,
   et il n'y a ici rien qu'une transition CSS ne sache faire.
   En prefers-reduced-motion, base.css coupe toutes les
   transitions et l'automatique est désactivé plus bas : le
   changement devient instantané et uniquement manuel.
   ============================================================ */

(function initGalleries() {
  const figures = Array.from(document.querySelectorAll(".project-gallery"));
  if (!figures.length) return;

  const utils = window.PortfolioUtils;
  if (!utils) return; // utils.js absent : le repli HTML reste en place

  const DELAY = 4500;      // durée d'affichage d'une capture
  const SWIPE_MIN = 40;    // px : en deçà, c'est un tap, pas un balayage
  const SHIFT = 14;        // px : amplitude du glissement à l'entrée

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Traduction : i18n.js peut ne pas être chargé (ou avoir échoué à
     lire son JSON). On lit window.PortfolioI18n au moment de l'appel,
     jamais au chargement, et on retombe sur le texte français. */
  function t(key, fallback) {
    const i18n = window.PortfolioI18n;
    return i18n && typeof i18n.t === "function" ? i18n.t(key, fallback) : fallback;
  }

  function counterLabel(index, total) {
    return t("gallery.counter", "Capture {n} sur {total}")
      .replace("{n}", index + 1)
      .replace("{total}", total);
  }

  /* ---------- construction d'une galerie ---------- */
  function build(figure, shots) {
    const total = shots.length;
    const uid = "gal-" + Math.random().toString(36).slice(2, 8);

    const viewport = document.createElement("div");
    viewport.className = "gallery-viewport";

    /* Squelette pendant le chargement de la PREMIERE capture.
       A ne pas confondre avec .gallery-empty (« captures à venir »),
       qui dit tout autre chose : ici les images existent et arrivent,
       là il n'y en a aucune. Les deux états restent distincts, et
       build() n'est de toute façon appelée que s'il y a des captures.

       Le ratio 16/10 est deja porte par .gallery-viewport : le
       squelette occupe exactement la place de l'image a venir. */
    viewport.classList.add("skeleton", "is-loading");
    viewport.setAttribute("aria-busy", "true");

    const track = document.createElement("ul");
    track.className = "gallery-track";

    const slides = shots.map((shot, i) => {
      const li = document.createElement("li");
      li.className = "gallery-slide" + (i === 0 ? " is-current" : "");
      li.id = uid + "-s" + i;

      const img = document.createElement("img");
      img.src = shot.src;
      img.alt = shot.alt;
      img.width = 1280;
      img.height = 800;
      img.decoding = "async";
      /* Seules la première et la suivante sont chargées d'emblée.
         Six galeries × plusieurs captures, tout charger au démarrage
         ferait payer au visiteur des images qu'il ne verra peut-être
         jamais. Les suivantes sont préchargées une par une, au fil
         du défilement (voir preload()). */
      if (i > 1) img.loading = "lazy";

      /* La premiere capture commande le squelette : c'est elle que le
         visiteur attend, les suivantes arrivent hors champ. error
         compte aussi, sinon une capture manquante laisserait le
         cadre battre indefiniment. */
      if (i === 0) {
        const settle = () => {
          viewport.classList.remove("skeleton", "is-loading");
          viewport.removeAttribute("aria-busy");
        };
        if (img.complete) settle();
        else {
          img.addEventListener("load", settle, { once: true });
          img.addEventListener("error", settle, { once: true });
        }
      }

      li.appendChild(img);
      track.appendChild(li);
      return li;
    });

    viewport.appendChild(track);

    const live = document.createElement("p");
    live.className = "gallery-live sr-only";
    live.setAttribute("aria-live", "polite");
    live.textContent = counterLabel(0, total);

    figure.textContent = ""; // retire le repli .gallery-empty
    figure.appendChild(viewport);

    let prevBtn = null;
    let nextBtn = null;
    let dots = [];

    /* Une seule capture : ni flèches, ni pastilles, ni minuterie.
       Des commandes qui ne commandent rien sont du bruit, et une
       pastille unique laisse croire qu'il manque des images. */
    if (total > 1) {
      prevBtn = navButton("prev", "M15 5 8 12l7 7");
      nextBtn = navButton("next", "M9 5l7 7-7 7");
      figure.appendChild(prevBtn);
      figure.appendChild(nextBtn);

      const dotsWrap = document.createElement("div");
      dotsWrap.className = "gallery-dots";
      dotsWrap.setAttribute("role", "tablist");
      dotsWrap.setAttribute("aria-label", t("gallery.dots", "Choisir une capture"));

      dots = shots.map((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "gallery-dot" + (i === 0 ? " is-current" : "");
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
        dot.setAttribute("aria-controls", slides[i].id);
        dot.setAttribute("aria-label", counterLabel(i, total));
        dotsWrap.appendChild(dot);
        return dot;
      });

      figure.appendChild(dotsWrap);
    }

    figure.appendChild(live);
    figure.classList.add("is-ready");
    if (total === 1) figure.classList.add("is-single");

    return { total, slides, prevBtn, nextBtn, dots, live };
  }

  function navButton(kind, path) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery-nav gallery-" + kind;
    btn.setAttribute(
      "aria-label",
      kind === "prev"
        ? t("gallery.prev", "Capture précédente")
        : t("gallery.next", "Capture suivante")
    );
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="' + path + '"/></svg>';
    return btn;
  }

  /* ---------- pilotage d'une galerie ---------- */
  function wire(figure, shots) {
    const ui = build(figure, shots);
    const { total, slides, prevBtn, nextBtn, dots, live } = ui;

    let index = 0;
    let timer = null;
    let stopped = false;   // le visiteur a pris la main : définitif
    let hovering = false;
    let focused = false;
    let visible = true;

    function preload(i) {
      const shot = shots[i];
      if (!shot || shot.preloaded) return;
      shot.preloaded = true;
      const img = new Image();
      img.src = shot.src;
    }

    function go(next, direction) {
      const target = (next + total) % total;
      if (target === index) return;

      const incoming = slides[target];
      const outgoing = slides[index];

      /* On pose la position de départ sans transition, on force un
         reflow, puis on relâche : sans ce reflow, le navigateur
         regroupe les deux écritures et l'image apparaît sans glisser. */
      incoming.style.transition = "none";
      incoming.style.transform = "translateX(" + direction * SHIFT + "px)";
      void incoming.offsetWidth;
      incoming.style.transition = "";
      incoming.style.transform = "";

      outgoing.classList.remove("is-current");
      incoming.classList.add("is-current");

      index = target;

      dots.forEach((dot, i) => {
        dot.classList.toggle("is-current", i === index);
        dot.setAttribute("aria-selected", i === index ? "true" : "false");
      });

      live.textContent = counterLabel(index, total);
      preload((index + 1) % total);
    }

    /* Toute action manuelle coupe l'automatique pour de bon. */
    function takeOver(next, direction) {
      stopped = true;
      syncTimer();
      go(next, direction);
    }

    function syncTimer() {
      clearInterval(timer);
      timer = null;
      if (stopped || total < 2 || reduced.matches) return;
      if (hovering || focused || !visible || document.hidden) return;
      timer = setInterval(() => go(index + 1, 1), DELAY);
    }

    if (total > 1) {
      prevBtn.addEventListener("click", () => takeOver(index - 1, -1));
      nextBtn.addEventListener("click", () => takeOver(index + 1, 1));
      dots.forEach((dot, i) => {
        dot.addEventListener("click", () => takeOver(i, i > index ? 1 : -1));
      });

      figure.addEventListener("mouseenter", () => { hovering = true; syncTimer(); });
      figure.addEventListener("mouseleave", () => { hovering = false; syncTimer(); });
      figure.addEventListener("focusin", () => { focused = true; syncTimer(); });
      figure.addEventListener("focusout", () => {
        // focusout part avant que le nouveau focus soit posé
        setTimeout(() => {
          focused = figure.contains(document.activeElement);
          syncTimer();
        }, 0);
      });

      figure.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          takeOver(index - 1, -1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          takeOver(index + 1, 1);
        }
      });

      /* Balayage tactile. Les écouteurs sont passifs et on ne fait
         JAMAIS de preventDefault : bloquer le geste bloquerait aussi
         le défilement vertical de la page. On se contente de lire le
         mouvement, et on l'ignore s'il est plus vertical qu'horizontal :
         c'est que le visiteur voulait faire défiler la page. */
      let startX = 0;
      let startY = 0;
      figure.addEventListener("touchstart", (event) => {
        const touch = event.changedTouches[0];
        startX = touch.clientX;
        startY = touch.clientY;
      }, { passive: true });

      figure.addEventListener("touchend", (event) => {
        const touch = event.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
        takeOver(dx < 0 ? index + 1 : index - 1, dx < 0 ? 1 : -1);
      }, { passive: true });

      document.addEventListener("visibilitychange", syncTimer);

      /* La minuterie ne tourne que si la galerie est à l'écran :
         six galeries qui défilent en fond, c'est six repaints par
         seconde pour personne. */
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            visible = entry.isIntersecting;
            syncTimer();
          });
        }, { threshold: 0.2 }).observe(figure);
      }

      if (typeof reduced.addEventListener === "function") {
        reduced.addEventListener("change", syncTimer);
      }

      preload(1);
      syncTimer();
    }

    /* Une capture disparue après la sonde (ou un WebP illisible) ne
       doit pas laisser une case blanche au milieu du défilement. */
    slides.forEach((slide) => {
      const img = slide.querySelector("img");
      img.addEventListener("error", () => { slide.classList.add("is-broken"); }, { once: true });
    });

    /* Ré-étiquetage au changement de langue : les libellés ont été
       générés en JS, aucun data-i18n ne les couvre. */
    return function relabel() {
      if (prevBtn) prevBtn.setAttribute("aria-label", t("gallery.prev", "Capture précédente"));
      if (nextBtn) nextBtn.setAttribute("aria-label", t("gallery.next", "Capture suivante"));
      const dotsWrap = figure.querySelector(".gallery-dots");
      if (dotsWrap) dotsWrap.setAttribute("aria-label", t("gallery.dots", "Choisir une capture"));
      dots.forEach((dot, i) => dot.setAttribute("aria-label", counterLabel(i, total)));
      live.textContent = counterLabel(index, total);
      slides.forEach((slide, i) => {
        const img = slide.querySelector("img");
        const shot = shots[i];
        if (img) img.alt = shot.key ? t(shot.key, shot.fallback) : shot.fallback;
      });
    };
  }

  /* ---------- amorçage ---------- */
  const relabels = [];

  figures.forEach(async (figure) => {
    const sources = utils.splitList(figure.dataset.shots, ",");
    const alts = utils.splitList(figure.dataset.alts, "|");
    if (!sources.length) return; // rien de prévu : le repli reste

    const altKey = (figure.dataset.i18nAlts || "").trim();

    /* On sonde tout en parallèle et on ne garde que ce qui répond.
       exists() renvoie null quand elle n'a pas pu savoir (file://,
       serveur qui refuse les HEAD) : dans ce cas on garde l'image,
       c'est le onerror de la balise qui tranchera. */
    const found = await Promise.all(sources.map((src) => utils.exists(src)));

    /* Chaque capture garde la trace de sa position D'ORIGINE : c'est
       elle qui la relie à sa description. data-alts et les clés i18n
       sont numérotés sur la liste complète, pas sur les survivantes :
       sans ça, une capture manquante décalerait toutes les suivantes
       et chaque image hériterait de la légende de sa voisine. */
    const shots = sources
      .map((src, i) => {
        const fallback = alts[i] || "";
        const key = altKey ? altKey + "." + (i + 1) : "";
        return { src, fallback, key, alt: key ? t(key, fallback) : fallback };
      })
      .filter((_, i) => found[i] !== false);

    if (!shots.length) return; // aucune capture en ligne : le repli reste

    relabels.push(wire(figure, shots));
  });

  /* i18n.js prévient de tout changement de langue. */
  document.addEventListener("i18n:changed", () => {
    relabels.forEach((fn) => {
      try { fn(); } catch (e) {}
    });
  });
})();
