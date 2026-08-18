(function () {
  "use strict";

  const TRACKING_URL = "https://altier-tracking.onrender.com/event";
  const ATTRIBUTION_KEY = "altier_attribution";
  const VISITOR_KEY = "altier_visitor_id";
  const SESSION_KEY = "altier_session_id";

  function id(storage, key) {
    let value = storage.getItem(key);
    if (!value) {
      value = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      storage.setItem(key, value);
    }
    return value;
  }

  function normalizeSource(value) {
    const s = String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
    if (["meta", "facebook", "fb", "facebook_ads", "meta_ads", "instagram", "ig"].includes(s)) return "meta";
    if (["sharechat", "share_chat", "sharechat_ads", "sharechat_moj", "moj"].includes(s)) return "sharechat";
    if (["direct", "organic", "none", "unknown", ""].includes(s)) return s === "unknown" ? "unknown" : "direct";
    return s;
  }

  function referrerSource() {
    try {
      const host = String(new URL(document.referrer || "").hostname || "").toLowerCase();
      if (
        host === "facebook.com" ||
        host.endsWith(".facebook.com") ||
        host === "fb.com" ||
        host.endsWith(".fb.com") ||
        host === "instagram.com" ||
        host.endsWith(".instagram.com")
      ) return "meta";

      if (host === "sharechat.com" || host.endsWith(".sharechat.com")) return "sharechat";
    } catch (_) {}

    return null;
  }

  function readAttribution() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || "{}");
    } catch (_) {}

    const p = new URLSearchParams(window.location.search);
    const explicitSource = p.get("utm_source") || p.get("source");
    const fbclid = p.get("fbclid");
    const currentSource = explicitSource
      ? normalizeSource(explicitSource)
      : (fbclid ? "meta" : (referrerSource() || saved.source || "direct"));

    const current = {
      source: currentSource,
      campaign: p.get("utm_campaign") || p.get("campaign") || saved.campaign || null,
      ad_set: p.get("utm_adset") || p.get("ad_set") || p.get("adset") || saved.ad_set || null,
      ad_name: p.get("utm_ad") || p.get("utm_content") || p.get("ad_name") || saved.ad_name || null
    };

    if (current.source !== "direct" || current.campaign || current.ad_set || current.ad_name) {
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(current));
    }

    return current;
  }

  function readMetaIdentifiers() {
    const params = new URLSearchParams(window.location.search);
    let fbp = null;
    let fbc = null;

    document.cookie
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        const eq = item.indexOf("=");
        if (eq === -1) return;

        const key = item.slice(0, eq);
        const value = decodeURIComponent(item.slice(eq + 1));

        if (key === "_fbp") fbp = value;
        if (key === "_fbc") fbc = value;
      });

    const fbclid = params.get("fbclid");

    if (!fbc && fbclid) {
      fbc = "fb.1." + Date.now() + "." + fbclid;

      try {
        document.cookie =
          "_fbc=" +
          encodeURIComponent(fbc) +
          ";path=/;max-age=7776000;SameSite=Lax";
      } catch (_) {}
    }

    return { fbp, fbc };
  }

  const visitorId = id(localStorage, VISITOR_KEY);
  const sessionId = id(sessionStorage, SESSION_KEY);
  const trackingToken =
    "ALT-" + visitorId.replace(/-/g, "").slice(0, 10).toUpperCase();

  const attribution = readAttribution();
  const metaIdentifiers = readMetaIdentifiers();

  function cropFromPage() {
    const path = window.location.pathname.toLowerCase();
    const map = [
      ["mirch", "mirch"],
      ["chilli", "mirch"],
      ["chili", "mirch"],
      ["tamatar", "tomato"],
      ["tomato", "tomato"],
      ["baingan", "brinjal"],
      ["baigan", "brinjal"],
      ["brinjal", "brinjal"],
      ["karela", "karela"],
      ["belvargiya", "karela"],
      ["papita", "papita"],
      ["papaya", "papita"],
      ["soybean", "soybean"],
      ["soyabean", "soybean"],
      ["shimla-mirch", "shimla_mirch"],
      ["paddy", "paddy"],
      ["rice", "paddy"],
      ["moong", "moong"],
      ["urad", "urad"]
    ];

    for (const item of map) {
      if (path.includes(item[0])) return item[1];
    }

    return null;
  }

  function send(eventName, crop, metadata) {
    const payload = {
      event_id: (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : "event-" + Date.now() + "-" + Math.random().toString(36).slice(2),
      event_name: eventName,
      session_id: sessionId,
      visitor_id: visitorId,
      crop: crop || cropFromPage(),
      source: attribution.source,
      campaign: attribution.campaign,
      ad_set: attribution.ad_set,
      ad_name: attribution.ad_name,
      landing_page: window.location.pathname || "/",
      event_time: new Date().toISOString(),
      metadata: Object.assign(
        {
          page_url: window.location.href,
          page_title: document.title,
          referrer: document.referrer || null,
          tracking_token: trackingToken,
          fbp: metaIdentifiers.fbp,
          fbc: metaIdentifiers.fbc
        },
        metadata || {}
      )
    };

    return fetch(TRACKING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }

  function appendTrackingToWhatsappLink(el) {
    const href = el.getAttribute("href");
    if (!href) return;

    try {
      const url = new URL(href, window.location.href);

      if (
        !url.hostname.includes("wa.me") &&
        !url.hostname.includes("whatsapp.com")
      ) {
        return;
      }

      let text = url.searchParams.get("text") || "";

      if (!/ALTIER\s*REF\s*:/i.test(text)) {
        text = text.trim() + "\n\n[ALTIER REF: " + trackingToken + "]";
        url.searchParams.set("text", text);
        el.setAttribute("href", url.toString());
      }
    } catch (_) {}
  }

  function pushSourceSpecificLeadSignal() {
    if (!window.dataLayer) window.dataLayer = [];

    const source = normalizeSource(attribution.source);
    let eventName = null;

    if (source === "sharechat") {
      eventName = "altier_lead_sharechat";
    } else if (source === "meta") {
      eventName = "altier_lead_meta";
    }

    if (eventName) {
      window.dataLayer.push({
        event: eventName,
        altier_source: source,
        visitor_id: visitorId,
        session_id: sessionId,
        tracking_token: trackingToken,
        crop: cropFromPage(),
        campaign: attribution.campaign,
        ad_set: attribution.ad_set,
        ad_name: attribution.ad_name
      });
    }
  }

  window.AltierTracking = {
    send,
    visitorId,
    sessionId,
    trackingToken,
    attribution,
    metaIdentifiers
  };

  document.addEventListener("DOMContentLoaded", function () {
    // Page-view signal.
    send("page_view", cropFromPage(), {
      page_type: "landing_or_crop_page"
    });

    // Crop-selection signal.
    document.querySelectorAll(".crop-card[data-crop]").forEach(function (el) {
      el.addEventListener("click", function () {
        send("crop_click", el.getAttribute("data-crop"), {
          page_type: "crop_selection"
        });
      });
    });

    // WhatsApp launch signal + unique attribution token in the prefilled message.
    document
      .querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"], [data-whatsapp]')
      .forEach(function (el) {
        appendTrackingToWhatsappLink(el);

        el.addEventListener("click", function () {
          appendTrackingToWhatsappLink(el);

          send("whatsapp_click", cropFromPage(), {
            destination: el.getAttribute("href") || null,
            cta_text: (el.textContent || "").trim().slice(0, 200),
            tracking_token: trackingToken,
            fbp: metaIdentifiers.fbp,
            fbc: metaIdentifiers.fbc
          });

          // Send a source-specific signal to Google Tag Manager.
          pushSourceSpecificLeadSignal();
        });
      });
  });
})();

/* =========================================================
   ALTIER LANGUAGE PERSISTENCE
   This is intentionally kept in the shared tracking client so
   every crop page using tracking.js gets the same language behavior.
   ========================================================= */
(function () {
  "use strict";

  const LANGUAGE_KEY = "altier_language";
  const DEFAULT_LANGUAGE = "hi";

  function getCookie(name) {
    const prefix = name + "=";
    const parts = document.cookie.split(";");

    for (let i = 0; i < parts.length; i++) {
      const item = parts[i].trim();
      if (item.indexOf(prefix) === 0) {
        return decodeURIComponent(item.slice(prefix.length));
      }
    }

    return "";
  }

  function getLanguageFromGoogleCookie() {
    const value = getCookie("googtrans");
    if (!value) return null;

    const parts = value.split("/");
    const lang = parts[parts.length - 1];
    return (lang === "mr" || lang === "hi") ? lang : null;
  }

  function getSavedLanguage() {
    let saved = null;

    try {
      saved = localStorage.getItem(LANGUAGE_KEY);
    } catch (_) {}

    if (saved === "mr" || saved === "hi") return saved;

    const cookieLanguage = getLanguageFromGoogleCookie();

    if (cookieLanguage) {
      try {
        localStorage.setItem(LANGUAGE_KEY, cookieLanguage);
      } catch (_) {}
      return cookieLanguage;
    }

    return DEFAULT_LANGUAGE;
  }

  function saveLanguage(lang) {
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch (_) {}
  }

  function addLanguageUI() {
    if (document.getElementById("altier-language-area")) return;

    const style = document.createElement("style");
    style.id = "altier-language-style";
    style.textContent = `
      #altier-language-area {
        padding: 9px 0 8px;
        text-align: center;
        background: #fff;
        border-bottom: 1px solid #dfe8e1;
        font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
      }
      #altier-language-area .altier-language-label {
        color: #68716a;
        font-size: 12px;
        margin-bottom: 5px;
      }
      #altier-language-area .altier-language-buttons {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px;
        background: #f1f5f2;
        border: 1px solid #dce5de;
        border-radius: 30px;
      }
      #altier-language-area button {
        border: 0;
        background: transparent;
        color: #526058;
        font-size: 13px;
        font-weight: 800;
        padding: 6px 14px;
        border-radius: 22px;
        cursor: pointer;
      }
      #altier-language-area button.active {
        background: #075c2b;
        color: #fff;
      }
      #altier-google-translate-element {
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      .goog-te-banner-frame.skiptranslate { display: none !important; }
      body { top: 0 !important; }
      .goog-logo-link, .goog-te-gadget span { display: none !important; }
      .goog-te-gadget { font-size: 0 !important; }
    `;
    document.head.appendChild(style);

    const area = document.createElement("div");
    area.id = "altier-language-area";
    area.innerHTML = `
      <div class="altier-language-label">🌐 भाषा चुनें</div>
      <div class="altier-language-buttons">
        <button id="altier-hi-btn" type="button">हिंदी</button>
        <button id="altier-mr-btn" type="button">मराठी</button>
      </div>
    `;

    const translateElement = document.createElement("div");
    translateElement.id = "altier-google-translate-element";

    document.body.insertBefore(area, document.body.firstChild);
    document.body.insertBefore(translateElement, area.nextSibling);
  }

  function setActiveButton(lang) {
    const hi = document.getElementById("altier-hi-btn");
    const mr = document.getElementById("altier-mr-btn");
    if (!hi || !mr) return;

    hi.classList.toggle("active", lang === "hi");
    mr.classList.toggle("active", lang === "mr");
  }

  function applyLanguage(lang) {
    saveLanguage(lang);
    setActiveButton(lang);

    const select = document.querySelector(".goog-te-combo");

    if (!select) {
      setTimeout(function () {
        applyLanguage(lang);
      }, 300);
      return;
    }

    select.value = lang;
    select.dispatchEvent(new Event("change"));
  }

  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement({
      pageLanguage: "hi",
      includedLanguages: "hi,mr",
      autoDisplay: false
    }, "altier-google-translate-element");

    const lang = getSavedLanguage();
    setActiveButton(lang);

    setTimeout(function () {
      applyLanguage(lang);
    }, 100);
  };

  document.addEventListener("DOMContentLoaded", function () {
    addLanguageUI();

    const lang = getSavedLanguage();
    setActiveButton(lang);

    document.getElementById("altier-hi-btn").addEventListener("click", function () {
      applyLanguage("hi");
    });

    document.getElementById("altier-mr-btn").addEventListener("click", function () {
      applyLanguage("mr");
    });

    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
  });
})();