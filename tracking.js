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

  function readAttribution() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || "{}");
    } catch (_) {}

    const p = new URLSearchParams(window.location.search);
    const current = {
      source: p.get("utm_source") || p.get("source") || saved.source || "direct",
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
        });
      });
  });
})();
