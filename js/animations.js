/* ============================================================
   ANIMATIONS.JS : toutes les animations GSAP / ScrollTrigger
   du portfolio.

   Exposé comme `window.PortfolioAnimations` (script classique,
   pas de module ES) pour que main.js puisse l'appeler et pour
   que le site fonctionne en ouverture directe via file://.

   Politique de résilience : si GSAP ne charge pas (CDN bloqué,
   hors-ligne), `init()` s'arrête immédiatement et ne touche à
   aucun style : tout le contenu reste visible tel que défini
   par le CSS. Les états "avant animation" (opacity/translate)
   ne sont donc jamais posés en dur dans le CSS, uniquement ici,
   juste avant de lancer chaque timeline.
   ============================================================ */

/* Exposé sur window explicitement : un `const` de haut niveau dans un
   script classique n'attache RIEN à window, donc main.js ne le voyait
   pas et aucune animation ne se lançait. On assigne directement. */
window.PortfolioAnimations = (() => {

  function init() {
    if (typeof gsap === "undefined") return;

    const hasScrollTrigger = typeof ScrollTrigger !== "undefined";
    if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduced: "(prefers-reduced-motion: reduce)",
        full: "(prefers-reduced-motion: no-preference)"
      },
      (context) => {
        if (context.conditions.reduced) {
          initReducedMotion();
          return;
        }

        initHeroIntro();
        if (hasScrollTrigger) {
          initPipeline();
          initSectionReveals();
          initSkillsReveal();
        }
        // Sans ScrollTrigger on ne bloque rien : le contenu reste
        // dans son état visible par défaut.
        initProjectTilt();
      }
    );
    // Le pulse du point "disponible" de la statusbar est un keyframe
    // CSS pur et permanent (voir css/animations.css) : rien à faire ici.
  }

  /* ---------- 1 & 2. entrée du hero + titre en masque ---------- */
  function initHeroIntro() {
    const heroItems = gsap.utils.toArray('[data-anim="hero-item"]');
    const titleLines = gsap.utils.toArray(".hero h1 .line-inner");
    if (!heroItems.length && !titleLines.length) return;

    gsap.set(heroItems, { opacity: 0, y: 18 });
    gsap.set(titleLines, { yPercent: 100 });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.to(titleLines, {
      yPercent: 0,
      duration: 0.7,
      stagger: 0.12
    }, 1 * 0.12);

    heroItems.forEach((item) => {
      const order = parseFloat(item.dataset.heroOrder || "0");
      tl.to(item, {
        opacity: 1,
        y: 0,
        duration: 0.58
      }, order * 0.12);
    });
  }

  /* ---------- 3. la ligne du pipeline se dessine au scroll ----------
     Tout est calé sur une seule ligne de lecture dans le viewport :
     le trait est rempli jusqu'à elle, et un nœud s'allume quand
     c'est lui qui la franchit. La barre arrive donc exactement sur
     le point au moment où il s'allume, puis repart, au lieu de
     commencer à progresser dès que la section pointait en bas de
     l'écran, bien avant d'atteindre le nœud.

     Le remplissage est en pixels, pas en pourcentage : le trait ne
     couvre pas toute la section sur la première ni sur la dernière
     (il démarre au premier nœud et s'arrête au dernier), donc un
     pourcentage de la hauteur de section tomberait à côté. On lit
     la géométrie réelle des pseudo-éléments, ce qui suit aussi les
     points de rupture responsive. */
  function initPipeline() {
    const READING_LINE = "72%";

    gsap.utils.toArray(".stage").forEach((stage) => {
      let lineTop = 0, lineHeight = 0, nodeTop = 0;

      const measure = () => {
        const line = getComputedStyle(stage, "::before");
        const node = getComputedStyle(stage, "::after");
        lineTop = parseFloat(line.top) || 0;
        lineHeight = parseFloat(line.height) || 0;
        nodeTop = parseFloat(node.top) || 0;
      };
      // mesuré une fois par refresh, pas à chaque frame de scroll :
      // getComputedStyle force un recalcul de style
      measure();

      const paint = (self) =>
        stage.style.setProperty("--pipeline-fill", (self.progress * lineHeight).toFixed(1) + "px");

      ScrollTrigger.create({
        trigger: stage,
        start: () => `top+=${lineTop} ${READING_LINE}`,
        end: () => `top+=${lineTop + lineHeight} ${READING_LINE}`,
        onRefreshInit: measure,
        onRefresh: paint,
        onUpdate: paint
      });

      // le nœud s'allume quand le trait l'atteint, ni avant, ni après
      ScrollTrigger.create({
        trigger: stage,
        start: () => `top+=${nodeTop} ${READING_LINE}`,
        onRefreshInit: measure,
        onEnter: () => stage.classList.add("is-active"),
        onLeaveBack: () => stage.classList.remove("is-active")
      });
    });
  }

  /* ---------- 4. révélation des sections + stagger des cartes enfants ---------- */
  function initSectionReveals() {
    revealStage("#apropos", ".about-grid > *");
    revealStage("#competences", ".skill-card");
    revealStage("#projets", ".project");
    revealStage("#parcours", ".xp-item");
    revealStage("#contact", ".contact-card");
  }

  function revealStage(sectionSelector, cardsSelector) {
    const stage = document.querySelector(sectionSelector);
    if (!stage) return;

    const heading = [stage.querySelector(".stage-label"), stage.querySelector("h2")].filter(Boolean);
    const cards = gsap.utils.toArray(stage.querySelectorAll(cardsSelector));

    gsap.set(heading, { opacity: 0, y: 24 });
    if (cards.length) gsap.set(cards, { opacity: 0, y: 28 });

    const tl = gsap.timeline({
      defaults: { ease: "power3.out", duration: 0.6 },
      scrollTrigger: {
        trigger: stage,
        start: "top 78%",
        toggleActions: "play none none none"
      }
    });

    if (heading.length) tl.to(heading, { opacity: 1, y: 0, stagger: 0.08 });
    if (cards.length) tl.to(cards, { opacity: 1, y: 0, stagger: 0.1 }, heading.length ? "-=0.25" : 0);
  }

  /* ============================================================
     5. SKILLS : apparition en cascade des logos de technos

     Remplace le flottement permanent : chaque logo était animé par
     un tween GSAP récursif et infini, soit 28 tweens qui ne
     s'arrêtaient jamais tant que la section restait à l'écran.
     Coût CPU permanent (ventilateur, batterie) pour une décoration
     qui, en prime, interdisait d'afficher les étiquettes : les
     logos étant en position absolue dans une zone de hauteur fixe.

     La cascade est la même mécanique que revealStage(), mais posée
     sur la carte et non sur la section : les quatre cartes de
     compétences arrivent déjà en cascade, et faire partir les 28
     logos d'un seul ScrollTrigger aurait fait démarrer ceux de la
     dernière carte avant qu'elle ne soit à l'écran.

     `toggleActions: play none none none` : la cascade se joue une
     fois, puis les tweens sont terminés : plus rien ne tourne.
     ============================================================ */
  function initSkillsReveal() {
    gsap.utils.toArray(".skill-float").forEach((zone) => {
      const logos = gsap.utils.toArray(zone.querySelectorAll(".logo"));
      if (!logos.length) return;

      gsap.set(logos, { opacity: 0, y: 14, scale: 0.9 });
      gsap.to(logos, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.45,
        ease: "back.out(1.6)",
        stagger: 0.045,
        scrollTrigger: {
          trigger: zone,
          start: "top 88%",
          toggleActions: "play none none none"
        }
      });
    });
  }

  /* ---------- 6. tilt/lift des cartes projets au survol ---------- */
  function initProjectTilt() {
    const strength = 8; // degrés d'inclinaison max
    gsap.utils.toArray(".project").forEach((card) => {
      card.style.transformPerspective = "700px";
      card.style.transformStyle = "preserve-3d";

      const setRotateX = gsap.quickTo(card, "rotationX", { duration: 0.4, ease: "power3.out" });
      const setRotateY = gsap.quickTo(card, "rotationY", { duration: 0.4, ease: "power3.out" });
      const setLift = gsap.quickTo(card, "y", { duration: 0.4, ease: "power3.out" });

      card.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        const bounds = card.getBoundingClientRect();
        const relX = (event.clientX - bounds.left) / bounds.width - 0.5;
        const relY = (event.clientY - bounds.top) / bounds.height - 0.5;
        setRotateY(relX * strength);
        setRotateX(-relY * strength);
        setLift(-4);
      });

      card.addEventListener("pointerleave", () => {
        gsap.to(card, {
          rotationX: 0,
          rotationY: 0,
          y: 0,
          duration: 0.6,
          ease: "elastic.out(1, 0.5)"
        });
      });
    });
  }

  /* ---------- prefers-reduced-motion : simple fade, pas de scrub/tilt ---------- */
  function initReducedMotion() {
    const targets = gsap.utils.toArray('[data-anim="hero-item"], .hero h1 .line-inner, .skill-card, .project, .xp-item, .contact-card, .about-grid > *');
    if (targets.length) {
      gsap.from(targets, { opacity: 0, duration: 0.5, stagger: 0.04 });
    }

    document.querySelectorAll(".stage").forEach((stage) => {
      // pas de scrub en mouvement réduit : le pipeline est montré
      // entièrement parcouru (100% et non une valeur en px)
      stage.style.setProperty("--pipeline-fill", "100%");
      stage.classList.add("is-active");
    });
  }

  return { init };
})();

/* Auto-démarrage. L'appel venait de main.js, qui s'exécute
   maintenant AVANT ce fichier : GSAP étant le plus lourd des
   scripts, tout ce qui n'en dépend pas est passé devant lui
   (voir l'ordre des <script> dans index.html).

   Ce fichier est le dernier déclaré, donc le dernier exécuté :
   s'initialiser ici revient exactement à ce que faisait main.js,
   et garantit toujours que gallery.js a fini de construire ses
   galeries. init() porte déjà sa propre garde `typeof gsap`, il
   n'y a donc rien à vérifier de plus ici. */
window.PortfolioAnimations.init();
