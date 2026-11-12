/**
 * three-scene.js — decorative cinematic 3D space background (Phase 2).
 *
 * Purely cosmetic: this module never reads or writes game state.
 * Loaded dynamically by boot3d.js only when WebGL is available;
 * on any failure the CSS space scene remains as the fallback.
 *
 * Intel integrated graphics optimizations:
 *   - No lights at all: MeshBasicMaterial with pre-shaded canvas textures
 *   - antialias: off, pixel ratio capped at 1.5 (1.0 in low mode)
 *   - small procedural textures (256px), no post-processing
 *   - "low mode" auto-engages if FPS < 28, and the scene shuts down
 *     (restoring the CSS fallback) if still below 24 FPS
 *   - rendering pauses when the tab is hidden
 *   - prefers-reduced-motion renders a single static frame
 */
import * as THREE from "three";

const LOW_KEY = "astro-command-3d-low";
const TARGET_FPS_LOW = 28;
const TARGET_FPS_OFF = 24;

/* ==========================================================================
   Procedural textures — tiny canvases, baked shading instead of lights
   ========================================================================== */

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function toTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Banded gas-giant texture with a baked terminator (dark side). */
function gasGiantTexture() {
  const [c, x] = makeCanvas(256, 128);
  const bands = ["#f7c07a", "#e89a4b", "#d97c2b", "#c26a22", "#f0a35c", "#b25a1c", "#e89a4b", "#d97c2b"];
  let y = 0;
  let i = 0;
  while (y < 128) {
    const h = 8 + Math.abs(Math.sin(i * 2.7)) * 6 + Math.random() * 4;
    x.fillStyle = bands[i % bands.length];
    x.globalAlpha = 0.9;
    x.fillRect(0, y, 256, h + 1);
    y += h;
    i += 1;
  }
  x.globalAlpha = 1;
  // Baked shading: darken toward the right edge (fake terminator)
  const shade = x.createLinearGradient(0, 0, 256, 0);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.55, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(4,6,13,0.8)");
  x.fillStyle = shade;
  x.fillRect(0, 0, 256, 128);
  return toTexture(c);
}

/** Rocky planet texture: base gradient + darker splotches. */
function rockyTexture(base, dark, size = 256) {
  const [c, x] = makeCanvas(size, size);
  x.fillStyle = base;
  x.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i += 1) {
    const r = 4 + Math.random() * 26;
    x.globalAlpha = 0.1 + Math.random() * 0.2;
    x.fillStyle = Math.random() > 0.4 ? dark : base;
    x.beginPath();
    x.ellipse(Math.random() * size, Math.random() * size, r, r * (0.4 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
  const shade = x.createLinearGradient(0, 0, size, 0);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.6, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(4,6,13,0.8)");
  x.fillStyle = shade;
  x.fillRect(0, 0, size, size);
  return toTexture(c);
}

/** Concentric ring bands — RingGeometry's planar UVs map this correctly. */
function ringTexture() {
  const [c, x] = makeCanvas(256, 256);
  const cx = 128;
  for (let r = 128; r > 40; r -= 2) {
    const t = (128 - r) / 88; // 0 inner .. 1 outer
    x.globalAlpha = 0.25 + Math.abs(Math.sin(t * 21)) * 0.45;
    x.strokeStyle = t < 0.75 ? "#e8b45a" : "#f9d98a";
    x.lineWidth = 2;
    x.beginPath();
    x.arc(cx, cx, r, 0, Math.PI * 2);
    x.stroke();
  }
  x.globalAlpha = 1;
  return toTexture(c);
}

/** Soft radial glow used for nebula sprites. */
function glowTexture(color) {
  const [c, x] = makeCanvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return toTexture(c);
}

/* ==========================================================================
   Scene construction
   ========================================================================== */

function createStars(count, radiusMin, radiusMax, size, color) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    // Random point in a spherical shell around the origin
    const r = radiusMin + Math.random() * (radiusMax - radiusMin);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size,
    color,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

export function initSpaceScene({ holder, reducedMotion = false }) {
  if (!holder) return;
  const sceneRoot = holder.parentElement || document.body;

  const canvas = document.createElement("canvas");
  canvas.id = "scene3d-canvas";
  canvas.setAttribute("aria-hidden", "true");
  holder.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,               // iGPU: skip MSAA
      powerPreference: "low-power",   // prefer integrated GPU
    });
  } catch (err) {
    canvas.remove();
    throw err; // caught by boot3d.js → CSS fallback
  }

  // Persisted or hardware-detected low-graphics mode
  let lowMode = false;
  try {
    lowMode = localStorage.getItem(LOW_KEY) === "1" || (navigator.hardwareConcurrency || 8) <= 4;
  } catch { /* ignore */ }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowMode ? 1 : 1.5));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060d);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  camera.position.set(0, 0, 22);

  /* ---- Star layers (two groups = cheap twinkle via material opacity) ---- */
  const starCount1 = lowMode ? 500 : 1100;
  const stars1 = createStars(starCount1, 40, 150, 0.65, 0xffffff);
  const stars2 = createStars(lowMode ? 0 : 450, 30, 110, 1.1, 0xbfe9ff);
  scene.add(stars1, stars2);

  /* ---- Ringed gas giant ---- */
  const giant = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, lowMode ? 24 : 36, lowMode ? 18 : 24),
    new THREE.MeshBasicMaterial({ map: gasGiantTexture() })
  );
  giant.position.set(14, 5, -35);
  scene.add(giant);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(7.5, 11.5, lowMode ? 40 : 72),
    new THREE.MeshBasicMaterial({
      map: ringTexture(),
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ring.position.copy(giant.position);
  ring.rotation.x = Math.PI / 2 - 0.35;
  ring.rotation.y = 0.35;
  scene.add(ring);

  /* ---- Teal rocky planet ---- */
  const tealPlanet = new THREE.Mesh(
    new THREE.SphereGeometry(3, lowMode ? 20 : 28, lowMode ? 14 : 20),
    new THREE.MeshBasicMaterial({ map: rockyTexture("#1fa8a0", "#0a3d44") })
  );
  tealPlanet.position.set(-13, -7, -28);
  scene.add(tealPlanet);

  /* ---- Moon ---- */
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, lowMode ? 16 : 24, lowMode ? 12 : 18),
    new THREE.MeshBasicMaterial({ map: rockyTexture("#c9d1e6", "#5c6480", 128) })
  );
  moon.position.set(-9, 9.5, -20);
  scene.add(moon);

  /* ---- Nebula glows (2 additive sprites) ---- */
  const glowGeo = new THREE.PlaneGeometry(1, 1);
  const nebulae = [];
  if (!lowMode) {
    const specs = [
      { color: "rgba(139,92,246,0.30)", pos: [-8, 10, -60], scale: 55 },
      { color: "rgba(34,211,238,0.20)", pos: [10, -8, -55], scale: 48 },
    ];
    for (const spec of specs) {
      const sprite = new THREE.Mesh(
        glowGeo,
        new THREE.MeshBasicMaterial({
          map: glowTexture(spec.color),
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      sprite.position.set(...spec.pos);
      sprite.scale.setScalar(spec.scale);
      scene.add(sprite);
      nebulae.push(sprite);
    }
  }

  /* ---- Sizing ---- */
  function resize() {
    const w = holder.clientWidth || window.innerWidth;
    const h = holder.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---- Pointer parallax (skipped in low mode / reduced motion) ---- */
  let targetX = 0;
  let targetY = 0;
  if (!reducedMotion && !lowMode) {
    window.addEventListener(
      "pointermove",
      (e) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true }
    );
  }

  /* ---- FPS watchdog: degrade on iGPU, fall back to CSS if hopeless ---- */
  const state = { fps: 0, mode: reducedMotion ? "static" : lowMode ? "low" : "full" };
  window.__scene3d = state; // exposed for diagnostics/testing
  let frames = 0;
  let acc = 0;

  function enterLowMode() {
    if (state.mode !== "full") return;
    lowMode = true;
    state.mode = "low";
    scene.remove(stars2);
    nebulae.forEach((n) => scene.remove(n));
    renderer.setPixelRatio(1);
    try {
      localStorage.setItem(LOW_KEY, "1");
    } catch { /* ignore */ }
  }

  function shutdown() {
    state.mode = "css-fallback";
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    renderer.dispose();
    canvas.remove();
    sceneRoot.classList.remove("space-scene--3d");
  }

  /* ---- Render loop ---- */
  let elapsed = 0;
  let last = performance.now();
  let rafId = 0;

  function tick(now) {
    rafId = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;

    // Cheap "twinkle": oscillate layer opacity instead of per-star work
    stars1.material.opacity = 0.6 + Math.sin(elapsed * 1.1) * 0.25;
    if (stars2.parent) stars2.material.opacity = 0.7 + Math.sin(elapsed * 1.7 + 2) * 0.3;

    // Slow planet drift
    giant.rotation.y += dt * 0.03;
    tealPlanet.rotation.y -= dt * 0.02;
    moon.rotation.y += dt * 0.05;

    // Gentle nebula breathing
    nebulae.forEach((n, i) => {
      n.material.opacity = 0.4 + Math.sin(elapsed * 0.4 + i * 2.2) * 0.12;
    });

    // Smooth camera parallax
    camera.position.x += (targetX * 1.6 - camera.position.x) * Math.min(1, dt * 2);
    camera.position.y += (-targetY * 1.0 - camera.position.y) * Math.min(1, dt * 2);
    camera.lookAt(0, 0, -10);

    renderer.render(scene, camera);

    // FPS watchdog
    frames += 1;
    acc += dt;
    if (acc >= 1.5) {
      state.fps = Math.round(frames / acc);
      frames = 0;
      acc = 0;
      if (state.fps < TARGET_FPS_LOW && state.mode === "full") enterLowMode();
      else if (state.fps < TARGET_FPS_OFF && state.mode === "low") shutdown();
    }
  }

  /* ---- Lifecycle: pause when hidden, static frame for reduced motion ---- */
  function startLoop() {
    last = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    cancelAnimationFrame(rafId);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLoop();
    else if (state.mode !== "static" && state.mode !== "css-fallback") startLoop();
  });

  // Mark the CSS scene as replaced only after a successful first render
  renderer.render(scene, camera);
  sceneRoot.classList.add("space-scene--3d");

  if (reducedMotion) {
    // Single static frame; re-render on resize only
    window.addEventListener("resize", () => renderer.render(scene, camera));
    state.mode = "static";
    return;
  }

  startLoop();
}
