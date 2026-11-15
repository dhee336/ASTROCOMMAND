/**
 * animation.js — Phase 3 GSAP animation layer for ASTROCOMMAND.
 *
 * Purely decorative: never reads or writes game state, only animates DOM.
 * Design rules:
 *   - GSAP is feature-detected at CALL time: if the CDN failed, every method
 *     becomes a safe no-op and the app behaves exactly as before (CSS
 *     keyframe animations remain as the fallback).
 *   - prefers-reduced-motion disables everything.
 *   - iGPU friendly: only transform / opacity / small custom-property
 *     tweens, short durations, no filter/shadow/blur animation.
 *
 * Exposes window.Ani — app.js calls it with optional chaining
 * (window.Ani?.x()), so even if this file fails to load nothing breaks.
 */
(() => {
  "use strict";

  const media = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  let forceReduced = false; // test hook only

  const isReduced = () => forceReduced || !!(media && media.matches);
  const hasGsap = () => typeof window.gsap !== "undefined";
  /** GSAP + motion allowed? */
  const ok = () => hasGsap() && !isReduced();

  if (hasGsap()) {
    // Short, professional defaults everywhere.
    window.gsap.defaults({ ease: "power2.out", overwrite: "auto" });
  }

  /* ------------------------------------------------------------------ */
  /* Screen transitions                                                  */
  /* ------------------------------------------------------------------ */

  /**
   * Cinematic screen entrance. Disables the CSS keyframe fallback for this
   * element while GSAP drives the motion (no double animation).
   */
  function screen(el) {
    if (!ok() || !el) return;
    // Entering the dashboard starts a fresh render cycle: the first build
    // (mission start / resume / restart) is always static; only genuine
    // in-session value changes animate afterwards.
    if (el.id === "screen-dashboard") prevValues.clear();
    el.style.animation = "none";
    window.gsap.fromTo(
      el,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.5, clearProps: "transform" }
    );
  }

  /* ------------------------------------------------------------------ */
  /* Group entrances (mission cards, panels, results)                    */
  /* ------------------------------------------------------------------ */

  /** Staggered fade-up of an element's children. */
  function staggerIn(container, selector) {
    if (!ok() || !container) return;
    const items = selector ? container.querySelectorAll(selector) : container.children;
    if (!items.length) return;
    window.gsap.fromTo(
      items,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, clearProps: "transform" }
    );
  }

  /** Landing-page hero intro — runs once on initial page load. */
  function heroIntro() {
    if (!ok()) return;
    const hero = document.querySelector(".hero");
    if (!hero || !hero.closest(".screen--active")) return;
    window.gsap.fromTo(
      hero.children,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.09, delay: 0.15, clearProps: "transform" }
    );
  }

  /* ------------------------------------------------------------------ */
  /* Resource gauges                                                     */
  /* ------------------------------------------------------------------ */

  const prevValues = new Map(); // gauge id -> last rendered value

  /**
   * Animate a gauge card when its value changed since the last render.
   * Tweens the ring's `--p` custom property (conic-gradient arc) and
   * counts the numeric readout. Cheap: one small repaint per frame.
   */
  function gauge(card, gaugeId, toPercent, toNumber) {
    if (!card || !gaugeId) return;
    const prev = prevValues.get(gaugeId);
    prevValues.set(gaugeId, toPercent);

    if (!ok() || prev === undefined || prev === toPercent) return;

    const ring = card.querySelector(".stat-card__ring");
    const valueEl = card.querySelector(".stat-card__value");
    if (!ring || !valueEl) return;

    const counter = { v: prev };
    window.gsap.to(counter, {
      v: toNumber,
      duration: 0.55,
      onUpdate: () => {
        // Text node only — keeps the % unit element intact.
        if (valueEl.firstChild) {
          valueEl.firstChild.nodeValue = String(Math.round(counter.v));
        }
      },
    });
    window.gsap.fromTo(
      ring,
      { "--p": prev },
      { "--p": toPercent, duration: 0.55 }
    );
  }

  /** Clear gauge history (new mission / resume) so the first render is static. */
  function resetGauges() {
    prevValues.clear();
  }

  /* ------------------------------------------------------------------ */
  /* Emergency modal                                                     */
  /* ------------------------------------------------------------------ */

  /** Alert-style modal entrance: overlay fade + modal pop + choice stagger. */
  function modalIn(overlay) {
    if (!ok() || !overlay) return;
    const modal = overlay.querySelector(".modal");
    const choices = overlay.querySelectorAll(".event-choice");
    // Let GSAP own the motion; mute the CSS keyframe fallback.
    overlay.style.animation = "none";
    if (modal) modal.style.animation = "none";
    window.gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    if (modal) {
      window.gsap.fromTo(
        modal,
        { opacity: 0, y: 26, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out", clearProps: "transform" }
      );
    }
    if (choices.length) {
      window.gsap.fromTo(
        choices,
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.35, stagger: 0.06, delay: 0.18, clearProps: "transform" }
      );
    }
  }

  /**
   * Smooth modal exit. Calls `done()` when the overlay is ready to be
   * hidden. Returns true if an animated exit is in progress, false when
   * `done()` has already run (no-GSAP / reduced-motion path).
   */
  function modalOut(overlay, done) {
    if (!ok() || !overlay || typeof done !== "function") {
      if (typeof done === "function") done();
      return false;
    }
    const modal = overlay.querySelector(".modal");
    let finished = false;
    const finish = () => {
      if (finished) return; // idempotent: first of tween/timeout wins
      finished = true;
      overlay.style.animation = "";
      overlay.style.opacity = "";
      if (modal) modal.style.animation = "";
      done();
    };
    window.gsap.to(overlay, {
      opacity: 0,
      duration: 0.22,
      ease: "power1.in",
      onComplete: finish,
    });
    // Safety net: heavily throttled tabs (background/occluded) barely tick
    // rAF; ensure the modal always closes and the game flow continues.
    setTimeout(finish, 1000);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Emergency alert accents                                             */
  /* ------------------------------------------------------------------ */

  /** Subtle triple pulse on the dashboard status chip when an alert fires. */
  function alertPulse(el) {
    if (!el) return;
    if (!ok()) {
      // CSS fallback pulse (no GSAP / reduced motion → static class)
      el.classList.add("dash-chip--pulse");
      setTimeout(() => el.classList.remove("dash-chip--pulse"), 1600);
      return;
    }
    window.gsap.fromTo(
      el,
      { scale: 1 },
      { scale: 1.09, duration: 0.2, yoyo: true, repeat: 3, ease: "power1.inOut", clearProps: "transform" }
    );
  }

  /* ------------------------------------------------------------------ */
  /* Results screen                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Score count-up on a proxy object (time-based, so even a throttled tab
   * lands exactly on the final value). Returns true when handled.
   */
  function score(el, target) {
    if (!ok() || !el) return false;
    const counter = { v: 0 };
    window.gsap.to(counter, {
      v: target,
      duration: 1.2,
      ease: "power3.out",
      onUpdate: () => {
        el.textContent = String(Math.round(counter.v));
      },
      onComplete: () => {
        el.textContent = String(Math.round(target));
      },
    });
    // Safety net: if the GSAP ticker is stalled (occluded tab), the true
    // value — already set by app.js — simply remains on screen.
    return true;
  }

  /** Staggered entrance of the results cards. */
  function resultsIn(screenEl) {
    if (!ok() || !screenEl) return;
    staggerIn(screenEl.querySelector(".results-grid"), ".info-card");
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle & diagnostics                                             */
  /* ------------------------------------------------------------------ */

  function init() {
    heroIntro();
  }

  /** Diagnostics for testing. */
  function status() {
    return { gsap: hasGsap(), reduced: isReduced() };
  }

  window.Ani = {
    init,
    screen,
    staggerIn,
    heroIntro,
    gauge,
    resetGauges,
    modalIn,
    modalOut,
    alertPulse,
    score,
    resultsIn,
    status,
    /* test-only hooks */
    _forceReduced(v) { forceReduced = !!v; },
  };
})();
