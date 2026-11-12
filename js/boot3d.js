/**
 * boot3d.js — Phase 2 loader for the cinematic 3D space background.
 *
 * Safety-first approach:
 *   1. Checks WebGL support before doing anything.
 *   2. Dynamically imports js/three-scene.js (ES module) so a CDN/import-map
 *      failure is catchable — the CSS space scene simply stays as fallback.
 *   3. Respects prefers-reduced-motion by passing the flag through.
 *
 * This file stays a classic script so the game never depends on ESM loading.
 */
(() => {
  "use strict";

  const sceneRoot = document.querySelector(".space-scene");
  if (!sceneRoot) return;

  // 1) WebGL feature detection (never throw).
  const webglSupported = (() => {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
      );
    } catch {
      return false;
    }
  })();

  if (!webglSupported) return; // CSS space scene remains visible

  // 2) Dedicated holder — removed automatically on any failure.
  const holder = document.createElement("div");
  holder.id = "scene3d";
  sceneRoot.appendChild(holder);

  const reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 3) Dynamic import: any failure (offline CDN, bad import map, module error)
  //    is caught here — the page keeps working with the CSS fallback.
  import("./three-scene.js?v=7")
    .then((module) => module.initSpaceScene({ holder, reducedMotion }))
    .catch((err) => {
      console.info("ASTRO COMMAND: 3D scene unavailable, using CSS fallback.", err);
      holder.remove();
    });
})();
