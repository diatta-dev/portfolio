/* ============================================================
   ANIMATIONS.JS — toutes les animations GSAP / ScrollTrigger
   du portfolio.

   Exposé comme `window.PortfolioAnimations` (script classique,
   pas de module ES) pour que main.js puisse l'appeler et pour
   que le site fonctionne en ouverture directe via file://.

   Politique de résilience : si GSAP ne charge pas (CDN bloqué,
   hors-ligne), `init()` s'arrête immédiatement et ne touche à
   aucun style — tout le contenu reste visible tel que défini
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
          initCounters();
        } else {
          // Pas de ScrollTrigger disponible : on ne bloque rien,
          // le contenu reste dans son état visible par défaut.
          initCounters(true);
        }
        initProjectTilt();

        // le nettoyage renvoyé est joué par matchMedia si l'on
        // bascule vers « mouvement réduit »
        return initSkillsFloat();
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
     le point au moment où il s'allume, puis repart — au lieu de
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

      // le nœud s'allume quand le trait l'atteint — ni avant, ni après
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
     5. SKILLS FLOAT — les logos dérivent dans leur carte

     Chaque logo enchaîne des étapes : un tween vers un point
     tiré au hasard, qui en relance un autre en finissant. Comme
     les tirages sont indépendants d'un logo à l'autre, rien ne
     se synchronise jamais — c'est ce qui donne l'effet organique.

     Deux réglages viennent de mesures faites dans le navigateur,
     pas d'une intuition :
     · la durée se déduit de la distance (vitesse constante).
       À durée fixe, les trajets courts rampaient à 2 px/s et la
       section paraissait figée.
     · chaque logo dérive dans SA cellule, élargie de SPREAD.
       En tirant les cibles dans toute la zone, le hasard les
       faisait converger et ils finissaient empilés.

     Le débordement est impossible : les bornes viennent de la
     taille réelle de la zone, moins la place réservée à
     l'étiquette. L'ease `sine.inOut` fait décélérer le logo
     avant chaque changement de cap — le « rebond doux ».

     Retourne une fonction de nettoyage, appelée par
     gsap.matchMedia() si l'on bascule en mouvement réduit.
     ============================================================ */
  function initSkillsFloat() {
    const zones = gsap.utils.toArray(".skill-float");
    if (!zones.length) return null;

    const PAD = 6;          // marge interne de la zone
    const LABEL_ROOM = 30;  // bande réservée en bas pour l'étiquette
    const SPEED = 34;       // px/s — la durée se déduit de la distance,
                            // sinon un trajet court rampe et paraît figé
    const MIN_TRIP = 6;     // bornes de durée, en secondes
    const MAX_TRIP = 14;
    const SPREAD = 1.6;     // débordement d'un logo hors de sa cellule

    /* On distingue souris et doigt via event.pointerType, pas via
       une media query : « (hover: hover) » est faux sur les portables
       tactiles et dans certains environnements alors qu'une souris
       est bien là — le survol y devenait inopérant. */
    const isMouse = (event) => event.pointerType !== "touch";

    const entries = [];
    const teardown = [];

    zones.forEach((zone) => {
      const logos = gsap.utils.toArray(zone.querySelectorAll(".logo"));
      if (!logos.length) return;

      const entry = { zone, logos, timelines: [], paused: false };
      entries.push(entry);
      zone.classList.add("is-floating");

      /* survol de la BOX à la souris : arrêt progressif (0,4 s) puis
         reprise en douceur — on ralentit le temps plutôt que de
         figer, ce qui évite la cassure d'un pause() brutal.
         Au doigt, on ne coupe rien : le flottement continue. */
      const slowDown = (event) => {
        if (!isMouse(event)) return;
        entry.paused = true;
        entry.timelines.forEach((tl) => tl &&
          gsap.to(tl, { timeScale: 0, duration: 0.4, ease: "power2.out", overwrite: true }));
      };
      const speedUp = (event) => {
        if (!isMouse(event)) return;
        entry.paused = false;
        entry.timelines.forEach((tl) => tl &&
          gsap.to(tl, { timeScale: 1, duration: 0.6, ease: "power2.inOut", overwrite: true }));
      };

      zone.addEventListener("pointerenter", slowDown);
      zone.addEventListener("pointerleave", speedUp);
      teardown.push(() => {
        zone.removeEventListener("pointerenter", slowDown);
        zone.removeEventListener("pointerleave", speedUp);
      });

      /* étiquette d'un logo : au survol tant que la souris reste
         dessus, ou 2 s après un tap au doigt */
      logos.forEach((logo) => {
        let timer;
        const show = () => { clearTimeout(timer); logo.classList.add("is-active"); };
        const hide = () => { clearTimeout(timer); logo.classList.remove("is-active"); };

        const onEnter = (event) => { if (isMouse(event)) show(); };
        const onLeave = (event) => { if (isMouse(event)) hide(); };
        const onTap = (event) => {
          if (isMouse(event)) return;
          show();
          timer = setTimeout(hide, 2000);
        };

        logo.addEventListener("pointerenter", onEnter);
        logo.addEventListener("pointerleave", onLeave);
        logo.addEventListener("pointerdown", onTap);
        teardown.push(() => {
          clearTimeout(timer);
          logo.removeEventListener("pointerenter", onEnter);
          logo.removeEventListener("pointerleave", onLeave);
          logo.removeEventListener("pointerdown", onTap);
          logo.classList.remove("is-active");
        });
      });
    });

    /* (re)calcule les bornes et relance les dérives. Rejoué au
       redimensionnement : la zone change de largeur en responsive. */
    const build = () => {
      entries.forEach((entry) => {
        entry.timelines.forEach((tl) => tl && tl.kill());
        entry.timelines.length = 0;

        /* tous les logos d'une zone ont la même taille : bornes
           calculées une fois, pas une fois par logo */
        const size = entry.logos[0];
        const count = entry.logos.length;
        const maxX = Math.max(0, entry.zone.clientWidth - size.offsetWidth - PAD * 2);
        const maxY = Math.max(0, entry.zone.clientHeight - size.offsetHeight - PAD * 2 - LABEL_ROOM);

        /* nombre de colonnes déduit du format de la zone : sur une
           carte large et basse il faut plus de colonnes que de
           rangées, sinon les départs se chevauchent verticalement */
        const cols = Math.max(1, Math.min(count,
          Math.round(Math.sqrt(count * (maxX + 1) / (maxY + 1)))));
        const cellW = maxX / cols;
        const cellH = maxY / Math.ceil(count / cols);

        entry.logos.forEach((logo, i) => {
          /* Chaque logo dérive dans SA cellule, élargie de SPREAD.
             Tirer les cibles dans toute la zone paraissait plus
             libre, mais au bout de quelques cycles le hasard les
             faisait tous converger au même endroit : ils
             s'empilaient. Des cellules qui se chevauchent gardent
             les croisements sans jamais laisser un paquet se
             former. */
          const cx = (i % cols + 0.5) * cellW;
          const cy = (Math.floor(i / cols) + 0.5) * cellH;
          const spanX = (cellW * SPREAD) / 2;
          const spanY = (cellH * SPREAD) / 2;
          const fromX = Math.max(0, cx - spanX), toX = Math.min(maxX, cx + spanX);
          const fromY = Math.max(0, cy - spanY), toY = Math.min(maxY, cy + spanY);

          gsap.set(logo, {
            x: PAD + gsap.utils.random(fromX, toX),
            y: PAD + gsap.utils.random(fromY, toY)
          });

          /* Une étape = un tween, qui en enchaîne un autre en
             finissant. C'est ce qui permet de caler la durée sur la
             distance réellement parcourue : un timeline répété
             fixerait la durée une fois pour toutes et les trajets
             courts sembleraient immobiles. */
          const index = entry.timelines.length;
          const drift = () => {
            const targetX = PAD + gsap.utils.random(fromX, toX);
            const targetY = PAD + gsap.utils.random(fromY, toY);
            const distance = Math.hypot(
              targetX - gsap.getProperty(logo, "x"),
              targetY - gsap.getProperty(logo, "y")
            );

            const tween = gsap.to(logo, {
              x: targetX,
              y: targetY,
              duration: gsap.utils.clamp(MIN_TRIP, MAX_TRIP, distance / SPEED),
              ease: "sine.inOut",
              onComplete: drift
            });

            entry.timelines[index] = tween;
            // survol en cours au moment où l'étape s'enchaîne :
            // le nouveau tween doit naître à l'arrêt, pas repartir
            if (entry.paused) tween.timeScale(0);
          };
          entry.timelines[index] = null;
          drift();
        });
      });
    };

    build();

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      teardown.forEach((off) => off());
      entries.forEach((entry) => {
        entry.timelines.forEach((tl) => tl && tl.kill());
        entry.zone.classList.remove("is-floating");
        gsap.set(entry.logos, { clearProps: "transform" });
      });
    };
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

  /* ---------- 8. compteur animé (optionnel, ex. uptime) ---------- */
  function initCounters(instant) {
    document.querySelectorAll("[data-counter]").forEach((el) => {
      const target = parseFloat(el.dataset.counterTo || el.textContent || "0");

      if (instant || typeof ScrollTrigger === "undefined") {
        el.textContent = target;
        return;
      }

      const counter = { value: 0 };
      el.textContent = "0";
      gsap.to(counter, {
        value: target,
        duration: 1.4,
        ease: "power2.out",
        snap: { value: 1 },
        onUpdate: () => { el.textContent = Math.round(counter.value); },
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none none"
        }
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

    initCounters(true);
  }

  return { init };
})();
