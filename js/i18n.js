/* ============================================================
   I18N.JS : bascule français / anglais.

   ── L'arbitrage retenu ──────────────────────────────────────
   Bascule en JavaScript, une seule URL (« voie 1 » du cahier des
   charges). Conséquence assumée : les moteurs de recherche
   n'indexent que le français, puisqu'ils lisent le HTML brut.

   C'est le bon compromis pour un portfolio de candidature : la
   quasi-totalité des visiteurs arrivent par un lien direct
   (candidature, LinkedIn, CV), pas par une recherche. Deux pages
   statiques auraient reproduit le problème de portfolio.html :
   deux fichiers censés dire la même chose qui divergent en trois
   jours. Le jour où le référencement anglais compte vraiment, les
   traductions sont déjà dans i18n/*.json : générer une page /en/
   au build devient une formalité.

   ── Le HTML reste la source française ───────────────────────
   Les textes français sont écrits en dur dans index.html. Ce
   fichier ne sert QUE de repli et de dictionnaire : si le JSON ne
   charge pas (réseau, file://), le site reste intégralement
   lisible en français. On n'a jamais de page vide en attente
   d'un fetch.

   ── Les attributs reconnus ──────────────────────────────────
     data-i18n="clé"                     → textContent
     data-i18n-html="clé"                → innerHTML (rare : balisage)
     data-i18n-attr="placeholder:clé,…"  → un ou plusieurs attributs
     data-i18n-query="subject:clé,…"     → query string d'un href
                                           (mailto:, wa.me : encodage
                                           fait ici, une seule fois)

   data-i18n-html est réservé aux quelques chaînes contenant du
   balisage (le <em> du titre, les <strong> des paragraphes).
   Partout ailleurs on passe par textContent : aucune raison
   d'ouvrir une porte d'injection pour du texte plat.
   ============================================================ */

(function initI18n() {
  const root = document.documentElement;
  const SUPPORTED = ["fr", "en"];
  const DEFAULT = "fr";

  /* La langue de départ a déjà été calculée par le script inline du
     <head> (?lang= > localStorage > navigator > fr) et posée sur
     <html lang>. On la relit plutôt que de refaire le calcul. */
  let lang = SUPPORTED.indexOf(root.lang) >= 0 ? root.lang : DEFAULT;

  const cache = Object.create(null);
  let dict = Object.create(null);

  function t(key, fallback) {
    const value = dict[key];
    return typeof value === "string" ? value : (fallback !== undefined ? fallback : key);
  }

  function load(code) {
    if (cache[code]) return Promise.resolve(cache[code]);
    return fetch("i18n/" + code + ".json")
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then((data) => {
        cache[code] = data;
        return data;
      });
  }

  /* ---------- application au document ---------- */

  function applyText(scope) {
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = dict[el.dataset.i18n];
      if (typeof value === "string") el.textContent = value;
    });

    scope.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const value = dict[el.dataset.i18nHtml];
      if (typeof value === "string") el.innerHTML = value;
    });

    scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      pairs(el.dataset.i18nAttr).forEach(({ name, key }) => {
        const value = dict[key];
        if (typeof value === "string") el.setAttribute(name, value);
      });
    });

    scope.querySelectorAll("[data-i18n-query]").forEach(applyQuery);
  }

  /* « nom:clé,nom:clé » → [{name, key}] */
  function pairs(spec) {
    return String(spec || "")
      .split(",")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const cut = chunk.indexOf(":");
        if (cut < 0) return null;
        return { name: chunk.slice(0, cut).trim(), key: chunk.slice(cut + 1).trim() };
      })
      .filter(Boolean);
  }

  /* Reconstruit la query d'un href à partir de textes EN CLAIR.

     Le piège classique est le double encodage : les href du HTML
     sont déjà encodés (« Demande%20d'acc%C3%A8s »). Si on encodait
     ça une seconde fois, le visiteur recevrait « %2520 » dans son
     client mail. On repart donc toujours de la base (avant le « ? »)
     mémorisée au premier passage, et les valeurs viennent du JSON
     en clair : un seul encodeURIComponent, jamais deux. */
  function applyQuery(el) {
    const spec = el.dataset.i18nQuery;
    const href = el.getAttribute("href");
    if (!spec || !href) return;

    if (el.dataset.i18nBase === undefined) {
      el.dataset.i18nBase = href.split("?")[0];
    }

    const query = pairs(spec)
      .map(({ name, key }) => {
        const value = dict[key];
        if (typeof value !== "string") return null;
        return encodeURIComponent(name) + "=" + encodeURIComponent(value);
      })
      .filter(Boolean)
      .join("&");

    el.setAttribute("href", el.dataset.i18nBase + (query ? "?" + query : ""));
  }

  /* Les balises du <head> ne portent pas d'attribut data-* : elles
     sont listées ici. og:url et le canonical sont volontairement
     absents : il n'existe qu'une URL (voir l'en-tête de ce fichier),
     la réécrire en ?lang=en demanderait à Google d'indexer une page
     qui n'a pas d'existence propre. */
  const HEAD = [
    ['meta[name="description"]', "content", "meta.description"],
    ['meta[property="og:title"]', "content", "meta.og.title"],
    ['meta[property="og:description"]', "content", "meta.og.description"],
    ['meta[property="og:image:alt"]', "content", "meta.og.image.alt"],
    ['meta[property="og:locale"]', "content", "meta.og.locale"],
    ['meta[property="og:locale:alternate"]', "content", "meta.og.locale.alternate"],
    ['meta[name="twitter:title"]', "content", "meta.og.title"],
    ['meta[name="twitter:description"]', "content", "meta.twitter.description"],
    ['meta[name="twitter:image"]', "content", null]
  ];

  function applyHead() {
    if (typeof dict["meta.title"] === "string") document.title = dict["meta.title"];
    HEAD.forEach(([selector, attr, key]) => {
      if (!key) return;
      const el = document.querySelector(selector);
      const value = dict[key];
      if (el && typeof value === "string") el.setAttribute(attr, value);
    });
  }

  /* ---------- bascule ---------- */

  function setLang(code, options) {
    const opts = options || {};
    if (SUPPORTED.indexOf(code) < 0) return Promise.resolve(false);

    return load(code).then(
      (data) => {
        dict = data;
        lang = code;
        root.lang = code;

        applyHead();
        applyText(document);

        if (opts.persist !== false) {
          try { localStorage.setItem("lang", code); } catch (e) {}
        }

        /* L'URL suit la langue : le lien devient partageable tel
           quel dans une candidature, ce qui est tout l'intérêt du
           paramètre. replaceState et non pushState : la bascule
           n'est pas une navigation, elle n'a rien à faire dans
           l'historique du bouton « retour ». */
        if (opts.url !== false) {
          try {
            history.replaceState(null, "", code === "en" ? "?lang=en" : location.pathname);
          } catch (e) {}
        }

        window.PortfolioI18n.lang = code;
        document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang: code } }));
        return true;
      },
      (err) => {
        /* Le dictionnaire n'a pas pu être lu (hors ligne, file://).
           On ne casse rien : le HTML français reste en place. */
        console.warn("[i18n] dictionnaire « " + code + " » illisible :", err.message);
        return false;
      }
    );
  }

  /* ---------- bouton de bascule ---------- */

  const toggle = document.querySelector(".lang-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      setLang(lang === "fr" ? "en" : "fr");
    });
  }

  /* Le bouton affiche la langue vers laquelle on VA, pas la langue
     courante : c'est la convention la moins ambiguë. Il porte aussi
     l'attribut lang correspondant, pour qu'un lecteur d'écran
     prononce « EN » en anglais et non à la française. */
  document.addEventListener("i18n:changed", () => {
    if (!toggle) return;
    const text = t("lang.toggle.text", "EN");
    const label = t("lang.toggle.label", "Switch to English");
    const code = t("lang.toggle.lang", "en");
    toggle.textContent = text;
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    toggle.setAttribute("lang", code);
  });

  /* ---------- contrôle de parité des clés ----------
     Signale toute clé présente d'un côté et absente de l'autre.
     Réservé au développement : le faire en production imposerait à
     chaque visiteur le téléchargement des DEUX dictionnaires pour
     un message que personne ne lira. */
  function check() {
    return Promise.all(SUPPORTED.map(load)).then((dicts) => {
      const [fr, en] = dicts;
      const missing = (a, b) => Object.keys(a).filter((k) => !(k in b));
      const inEn = missing(fr, en);
      const inFr = missing(en, fr);

      if (!inEn.length && !inFr.length) {
        console.info("[i18n] fr.json et en.json : " + Object.keys(fr).length + " clés, parité OK.");
      } else {
        if (inEn.length) console.warn("[i18n] clés absentes de en.json :", inEn);
        if (inFr.length) console.warn("[i18n] clés absentes de fr.json :", inFr);
      }
      return { inEn, inFr };
    }, () => ({ inEn: [], inFr: [] }));
  }

  window.PortfolioI18n = { lang, t, setLang, check, apply: applyText };

  /* En français, le HTML fait déjà foi : rien à charger, rien à
     appliquer, aucune requête. On ne paie le dictionnaire que si le
     visiteur arrive en anglais ou bascule. */
  if (lang !== DEFAULT) {
    setLang(lang, { persist: false, url: false });
  }

  const isDev = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ||
                location.search.indexOf("i18ncheck") >= 0;
  if (isDev) setTimeout(check, 1500);
})();
