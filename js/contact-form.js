/* ============================================================
   CONTACT-FORM.JS — validation et envoi du formulaire de contact.

   Le site est statique : il n'y a pas de serveur pour recevoir le
   message. L'envoi passe donc par Web3Forms (une requête POST vers
   leur API, qui relaie le message vers la boîte mail). Formspree
   fonctionne pareil : il suffit de changer data-endpoint dans
   index.html (https://formspree.io/f/VOTRE_ID) — la clé d'accès
   devient alors inutile et le reste du code ne bouge pas.

   Configuration : voir les attributs data-* sur <form id="contact-form">
   dans index.html. Tant que data-access-key vaut la valeur d'exemple,
   le formulaire n'est pas mort pour autant : il bascule sur le client
   mail du visiteur avec le message déjà rempli. Même chose si le
   réseau ou l'API tombe — un formulaire de contact ne doit jamais
   être un cul-de-sac.
   ============================================================ */

(function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const PLACEHOLDER_KEY = "VOTRE_CLE_WEB3FORMS";
  const endpoint = form.dataset.endpoint || "";
  const accessKey = form.dataset.accessKey || "";
  const mailto = form.dataset.mailto || "";
  const isConfigured = Boolean(endpoint) && Boolean(accessKey) && accessKey !== PLACEHOLDER_KEY;

  const statusEl = form.querySelector(".form-status");
  const submitBtn = form.querySelector(".form-submit");
  const honeypot = form.querySelector(".hp");
  const submitLabel = submitBtn ? submitBtn.innerHTML : "";

  const fields = {
    name: form.querySelector("#cf-name"),
    email: form.querySelector("#cf-email"),
    subject: form.querySelector("#cf-subject"),
    message: form.querySelector("#cf-message")
  };

  /* Volontairement permissif : un formulaire de contact n'a pas à
     jouer les douaniers de la RFC 5322. On écarte les fautes de
     frappe évidentes, c'est tout. */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const rules = [
    { el: fields.name, test: (v) => v.length >= 2, msg: "Merci d'indiquer votre nom." },
    { el: fields.email, test: (v) => EMAIL_RE.test(v), msg: "Cette adresse email semble incomplète." },
    { el: fields.message, test: (v) => v.length >= 10, msg: "Votre message est trop court (10 caractères minimum)." }
  ];

  /* ---------- affichage des erreurs, champ par champ ---------- */
  function errorNode(input) {
    return form.querySelector("#" + input.id + "-err");
  }

  function showError(input, msg) {
    const node = errorNode(input);
    input.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    if (node) {
      node.textContent = msg;
      node.hidden = false;
    }
  }

  function clearError(input) {
    const node = errorNode(input);
    input.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
    if (node) {
      node.textContent = "";
      node.hidden = true;
    }
  }

  function validate() {
    let firstInvalid = null;

    rules.forEach((rule) => {
      if (!rule.el) return;
      const value = rule.el.value.trim();
      if (rule.test(value)) {
        clearError(rule.el);
      } else {
        showError(rule.el, rule.msg);
        if (!firstInvalid) firstInvalid = rule.el;
      }
    });

    return firstInvalid;
  }

  // une fois l'erreur affichée, elle disparaît dès que la saisie
  // redevient valide : on ne laisse pas un message rouge sous un
  // champ que le visiteur vient de corriger
  rules.forEach((rule) => {
    if (!rule.el) return;
    rule.el.addEventListener("input", () => {
      if (rule.el.classList.contains("is-invalid") && rule.test(rule.el.value.trim())) {
        clearError(rule.el);
      }
    });
    rule.el.addEventListener("blur", () => {
      const value = rule.el.value.trim();
      if (value && !rule.test(value)) showError(rule.el, rule.msg);
    });
  });

  /* ---------- état visuel de l'envoi ---------- */
  function setStatus(type, msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "form-status" + (type ? " is-" + type : "");
  }

  function setBusy(busy) {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.innerHTML = busy ? "Envoi en cours…" : submitLabel;
  }

  /* ---------- repli : ouverture du client mail pré-rempli ---------- */
  function openMailClient(data) {
    if (!mailto) return;

    const subject = data.subject || "Contact depuis votre portfolio";
    const body =
      "Bonjour Elhadji,\r\n\r\n" +
      data.message + "\r\n\r\n— " +
      data.name + " (" + data.email + ")";

    window.location.href =
      "mailto:" + mailto +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
  }

  /* ---------- envoi ---------- */
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // robot : le piège est coché, on fait comme si tout allait bien
    if (honeypot && honeypot.checked) return;

    const firstInvalid = validate();
    if (firstInvalid) {
      setStatus("error", "Quelques champs sont à corriger avant l'envoi.");
      firstInvalid.focus();
      return;
    }

    const data = {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      subject: fields.subject ? fields.subject.value.trim() : "",
      message: fields.message.value.trim()
    };

    if (!isConfigured) {
      setStatus("info", "Ouverture de votre application mail avec le message pré-rempli…");
      openMailClient(data);
      return;
    }

    setBusy(true);
    setStatus("info", "Envoi du message…");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          from_name: data.name,
          name: data.name,
          email: data.email,
          subject: data.subject || "Contact depuis votre portfolio — " + data.name,
          message: data.message
        })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success !== false) {
        form.reset();
        setStatus("ok", "Message envoyé — merci ! Je vous réponds sous 24 h.");
      } else {
        throw new Error(result.message || "Réponse invalide du service d'envoi");
      }
    } catch (error) {
      setStatus(
        "error",
        "L'envoi automatique a échoué. Votre application mail va s'ouvrir avec le message."
      );
      openMailClient(data);
    } finally {
      setBusy(false);
    }
  });
})();
