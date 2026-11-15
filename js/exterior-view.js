/**
 * exterior-view.js — Phase 4 facade for the dashboard exterior-view panel.
 *
 * Owns everything cheap (DOM overlays, HUD text, minimize/hide controls)
 * and delegates the WebGL scene to js/exterior-view-3d.js, loaded by
 * dynamic import only when WebGL is available and the dashboard is first
 * shown. Any failure → permanent, fully-styled CSS fallback that still
 * displays every effect through the same overlay layers.
 *
 * Purely decorative: consumes plain visual flags, never game state.
 * app.js calls window.ExtView.sync({...}) / alert(eventId) — both are
 * safe no-ops if this file fails to load.
 */
(() => {
  "use strict";

  const PREF_KEY = "astro-command-extview";
  const importUrl = "./exterior-view-3d.js?v=16";

  /* ---------- panel element refs ---------- */
  let card, viewport, canvas, hud, showBtn;
  let minBtn, closeBtn;

  /* ---------- state ---------- */
  let mode = "off";            // off | booting | 3d | css
  let impl = null;             // 3d module api
  let lastEnvKey = null;
  let lastDay = null;
  let lastMissionKey = null;
  let dashboardActive = false;

  // Condition flags (from sync) and event flags (from alert), unioned.
  let conditions = { dust: 0, radiation: 0, solar: 0, critical: 0 };
  let eventDust = 0;
  let eventSolar = 0;
  let lastEventData = null;    // re-applied after module finishes booting
  let lastSyncData = null;

  const reduced = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  /* ---------- helpers ---------- */

  function setOverlay(name, opacity, activeClass) {
    const el = viewport && viewport.querySelector(`.ext-overlay--${name}`);
    if (!el) return;
    el.style.opacity = String(opacity);
    el.classList.toggle("is-active", !!activeClass && opacity > 0.05);
  }

  function paintOverlays() {
    const dust = Math.max(conditions.dust, eventDust);
    const solar = Math.max(conditions.solar, eventSolar);
    setOverlay("dust", dust * 0.85, dust > 0.05);
    setOverlay("solar", solar * 0.5, solar > 0.05);
    setOverlay("radiation", conditions.radiation * 0.6, true);
    setOverlay("critical", conditions.critical * 0.75, true);
  }

  function hudText(missionName, day, warnings) {
    if (!hud) return;
    const warn = warnings.length ? ` — ⚠ ${warnings[0]}` : "";
    hud.textContent = `${missionName.toUpperCase()} · DAY ${day}${warn}`;
  }

  function computeConditions(data) {
    const isMars = data.missionKey === "martian";
    const c = { dust: 0, radiation: 0, solar: 0, critical: 0 };
    // Mars always has a thin haze.
    if (isMars) c.dust = Math.max(c.dust, 0.22);
    if (data.radiation === "warn") c.radiation = 0.6;
    if (data.radiation === "critical") c.radiation = 1;
    if (data.habitat === "critical" || data.power === "critical") c.critical = Math.max(c.critical, 0.85);
    return c;
  }

  function warningsFor(data) {
    const w = [];
    if (eventDust > 0) w.push("DUST STORM");
    if (eventSolar > 0) w.push("SOLAR STORM");
    if (data.radiation === "warn") w.push("RADIATION ELEVATED");
    if (data.radiation === "critical") w.push("RADIATION SEVERE");
    if (data.habitat === "critical") w.push("HABITAT CRITICAL");
    if (data.power === "critical") w.push("POWER CRITICAL");
    return w;
  }

  function effectiveEffects() {
    return {
      dust: Math.max(conditions.dust, eventDust),
      solar: Math.max(conditions.solar, eventSolar),
      radiation: conditions.radiation,
      critical: conditions.critical,
    };
  }

  function pushToImpl() {
    if (mode !== "3d" || !impl) return;
    impl.setEffects(effectiveEffects());
    if (reduced) impl.resize(); // repaint static frame
  }

  function pushHud(data) {
    hudText(data.missionName, data.day, warningsFor(data));
  }

  function ensureEnv(data) {
    if (data.missionKey === lastEnvKey) return;
    lastEnvKey = data.missionKey;
    viewport.classList.toggle("ext-viewport--lunar", data.missionKey === "lunar");
    viewport.classList.toggle("ext-viewport--martian", data.missionKey === "martian");
    if (mode === "3d" && impl) {
      impl.setEnvironment(data.missionKey);
      pushToImpl();
    }
  }

  /* ---------- public API ---------- */

  function sync(data) {
    if (!card || !data) return;
    lastSyncData = data;

    // New mission / day rolled back (restart) → full reset of event effects.
    if (data.missionKey !== lastMissionKey || (lastDay !== null && data.day < lastDay)) {
      eventDust = 0;
      eventSolar = 0;
      lastEventData = null;
    }
    // Normal day advance → event effects expire.
    if (lastDay !== null && data.day > lastDay) {
      eventDust = 0;
      eventSolar = 0;
      lastEventData = null;
    }
    lastDay = data.day;
    lastMissionKey = data.missionKey;

    conditions = computeConditions(data);
    ensureEnv(data);
    paintOverlays();
    pushHud(data);
    pushToImpl();
  }

  function alert(eventId) {
    lastEventData = eventId;
    if (eventId === "dust-storm") eventDust = 1;
    else if (eventId === "solar-storm") eventSolar = 1;
    else if (eventId === "moonquake") doShake();
    else briefAlertPulse();
    paintOverlays();
    if (lastSyncData) pushHud(lastSyncData);
    pushToImpl();
  }

  function doShake() {
    if (reduced) return;
    if (mode === "3d" && impl) impl.shake();
    viewport.classList.remove("ext-shake");
    void viewport.offsetWidth; // restart CSS animation
    viewport.classList.add("ext-shake");
    setTimeout(() => viewport.classList.remove("ext-shake"), 1100);
  }

  function briefAlertPulse() {
    const radiation = viewport.querySelector(".ext-overlay--radiation");
    if (!radiation || reduced) return;
    radiation.classList.remove("ext-flash");
    void radiation.offsetWidth;
    radiation.classList.add("ext-flash");
    setTimeout(() => radiation.classList.remove("ext-flash"), 1500);
  }

  /* ---------- minimize / hide controls (rule 7) ---------- */

  function getPref() {
    try {
      const v = localStorage.getItem(PREF_KEY);
      return v === "min" || v === "hidden" ? v : "open";
    } catch {
      return "open";
    }
  }

  function setPref(v) {
    try {
      localStorage.setItem(PREF_KEY, v);
    } catch { /* session-only */ }
  }

  function applyLayout(pref) {
    card.classList.toggle("ext-card--min", pref === "min");
    card.classList.toggle("ext-card--hidden", pref === "hidden");
    showBtn.classList.toggle("hidden", pref !== "hidden");
    if (pref !== "hidden" && mode === "3d" && impl) {
      // Canvas size changes when collapsing — re-measure next frame.
      setTimeout(() => impl.resize(), 60);
    }
  }

  function wireControls() {
    minBtn.addEventListener("click", () => {
      const next = getPref() === "min" ? "open" : "min";
      setPref(next);
      applyLayout(next);
    });
    closeBtn.addEventListener("click", () => {
      setPref("hidden");
      applyLayout("hidden");
      pause3d();
    });
    showBtn.addEventListener("click", () => {
      setPref("open");
      applyLayout("open");
      resume3d();
    });
    applyLayout(getPref());
  }

  /* ---------- lifecycle: pause when dashboard inactive/hidden ---------- */

  function pause3d() {
    if (mode === "3d" && impl) impl.stop();
  }

  function resume3d() {
    if (mode === "3d" && impl && dashboardActive && getPref() !== "hidden" && !document.hidden) {
      impl.start();
      impl.resize();
    }
  }

  function watchVisibility() {
    const dash = document.getElementById("screen-dashboard");
    if (!dash) return;
    const update = () => {
      dashboardActive = dash.classList.contains("screen--active")
        && !dash.closest("body")?.hidden;
      if (dashboardActive) {
        // First activation: boot the 3D scene lazily (saves iGPU work on
        // screens that never open the dashboard).
        if (mode === "off") boot3d();
        resume3d();
      } else {
        pause3d();
      }
    };
    new MutationObserver(update).observe(dash, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause3d();
      else resume3d();
    });
    update();
  }

  /* ---------- boot: WebGL detect + dynamic import ---------- */

  function webglSupported() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      return false;
    }
  }

  function useCssFallback(reason) {
    if (mode === "css") return;
    mode = "css";
    canvas.style.display = "none";
    viewport.classList.add("ext-viewport--css");
    if (reason) console.info("ASTROCOMMAND: exterior view uses CSS fallback.", reason);
    paintOverlays();
  }

  function boot3d() {
    if (mode !== "off") return;
    if (!webglSupported()) {
      useCssFallback(new Error("no webgl"));
      return;
    }
    mode = "booting";
    let low = false;
    try {
      low = localStorage.getItem("astro-command-3d-low") === "1"
        || (navigator.hardwareConcurrency || 8) <= 4;
    } catch { /* ignore */ }

    import(importUrl)
      .then((module) => {
        impl = module.initExteriorView({
          canvas,
          low,
          reducedMotion: reduced,
          onFallback: (err) => {
            impl = null;
            useCssFallback(err);
          },
        });
        mode = "3d";
        if (lastEnvKey) {
          impl.setEnvironment(lastEnvKey);
          pushToImpl();
        } else if (lastSyncData) {
          ensureEnv(lastSyncData);
        }
        resume3d();
      })
      .catch((err) => {
        impl = null;
        useCssFallback(err);
      });
  }

  /* ---------- self-wiring ---------- */

  function init() {
    card = document.getElementById("ext-card");
    if (!card) return;
    viewport = document.getElementById("ext-viewport");
    canvas = document.getElementById("ext-canvas");
    hud = document.getElementById("ext-hud");
    showBtn = document.getElementById("ext-show");
    minBtn = document.getElementById("ext-min");
    closeBtn = document.getElementById("ext-close");

    wireControls();
    watchVisibility();
  }

  document.addEventListener("DOMContentLoaded", init);

  window.ExtView = { sync, alert };
})();
