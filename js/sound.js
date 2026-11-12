/**
 * sound.js — optional background ambience + UI sound effects (rule 8).
 *
 * Procedurally generated with the Web Audio API — no audio files, no CDN.
 * Sound is OFF by default (respects browser autoplay policies); the user
 * opts in via a visible toggle button in the top bar. The choice persists
 * in LocalStorage under "astro-command-sound".
 *
 * Exposes window.Sound.play(name) — safe no-op when disabled or unsupported.
 * app.js calls it at gameplay moments; it never touches game state.
 */
(() => {
  "use strict";

  const KEY = "astro-command-sound";

  let ctx = null;       // AudioContext (lazy, created on first opt-in/gesture)
  let master = null;    // master gain for everything
  let ambient = null;   // running ambience nodes
  let enabled = false;

  try {
    enabled = localStorage.getItem(KEY) === "on";
  } catch {
    enabled = false;
  }

  /** Create the AudioContext + master gain lazily. Returns false if unsupported. */
  function ensureCtx() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  /* ---------- Background ambience: slow detuned drone through a low-pass filter ---------- */

  function startAmbient() {
    if (ambient || !ensureCtx()) return;
    if (ctx.state === "suspended") ctx.resume();

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 54;    // deep hull hum

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 81.5;  // detuned fifth, slow beat

    // Very slow filter sweep so the drone breathes
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 20;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 160;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    // Fade the ambience in gently
    gain.gain.setTargetAtTime(0.045, ctx.currentTime, 2.5);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc1.start();
    osc2.start();
    lfo.start();
    ambient = { osc1, osc2, lfo, gain };
  }

  function stopAmbient() {
    if (!ambient) return;
    const a = ambient;
    ambient = null;
    try {
      a.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => {
        try { a.osc1.stop(); a.osc2.stop(); a.lfo.stop(); } catch { /* already stopped */ }
      }, 1200);
    } catch { /* ignore */ }
  }

  /* ---------- One-shot effects ---------- */

  /** Simple enveloped oscillator blip with optional frequency sweep. */
  function blip(freq, dur, type, vol, sweepTo) {
    if (!ensureCtx()) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  const SFX = {
    click: () => blip(660, 0.07, "square", 0.04),
    action: () => blip(300, 0.18, "triangle", 0.09, 520),
    day: () => blip(220, 0.55, "sawtooth", 0.05, 70),
    alert: () => {
      blip(440, 0.16, "square", 0.06);
      setTimeout(() => blip(554, 0.16, "square", 0.06), 190);
      setTimeout(() => blip(440, 0.22, "square", 0.06), 380);
    },
    success: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, "sine", 0.08), i * 130)),
    fail: () => [392, 311, 233, 174].forEach((f, i) => setTimeout(() => blip(f, 0.3, "sine", 0.08), i * 160)),
  };

  /* ---------- Visible mute control in the top bar ---------- */

  function applyButtonState(btn) {
    btn.textContent = enabled ? "🔊" : "🔇";
    btn.setAttribute("aria-pressed", String(enabled));
    btn.setAttribute("aria-label", enabled ? "Mute mission audio" : "Enable mission audio");
    btn.title = enabled ? "Mute mission audio" : "Enable mission audio";
  }

  function init() {
    const nav = document.querySelector(".topbar__nav");
    if (!nav) return;

    const btn = document.createElement("button");
    btn.className = "nav-link sound-toggle";
    btn.type = "button";
    applyButtonState(btn);

    btn.addEventListener("click", () => {
      enabled = !enabled;
      try {
        localStorage.setItem(KEY, enabled ? "on" : "off");
      } catch { /* storage unavailable — session-only */ }
      if (enabled) {
        startAmbient();
        blip(660, 0.08, "sine", 0.07);
      } else {
        stopAmbient();
      }
      applyButtonState(btn);
    });

    nav.appendChild(btn);

    // Persisted "on" state: AudioContext starts suspended until a gesture —
    // resume it on the first interaction anywhere on the page.
    if (enabled) startAmbient();
    const resumeOnce = () => {
      if (enabled && ensureCtx() && ctx.state === "suspended") ctx.resume();
    };
    window.addEventListener("pointerdown", resumeOnce, { once: true });
  }

  /** Public API used by app.js — always safe to call. */
  window.Sound = {
    play(name) {
      if (enabled && SFX[name]) SFX[name]();
    },
    get enabled() {
      return enabled;
    },
  };

  document.addEventListener("DOMContentLoaded", init);
})();
