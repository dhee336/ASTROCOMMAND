/**
 * exterior-view-3d.js — Phase 4 decorative exterior-view panel (Three.js).
 *
 * A small second viewport on the mission dashboard showing the outpost's
 * outside environment (Moon or Mars). Purely cosmetic: it receives plain
 * visual flags from the UI layer and never reads game state.
 *
 * Intel-iGPU strategy (same philosophy as three-scene.js):
 *   - MeshBasicMaterial only, baked canvas textures, no lights
 *   - pixel ratio 1, antialias off, "low-power" GPU preference
 *   - low-poly geometry, tiny textures
 *   - render loop capped at 30 fps
 *   - dust particles only when needed (fewer in low mode)
 *   - FPS watchdog: sustained < 24 fps → onFallback() (facade switches
 *     the panel to its CSS-only version)
 *   - prefers-reduced-motion: single static frame per state change
 *   - fog/particles/tint lerps are plain arithmetic, no animation lib
 */
import * as THREE from "three";

const FPS_LIMIT = 30;
const WATCHDOG_FPS = 24;

/* ---------- baked textures (tiny canvases) ---------- */

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function toTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function groundTexture(base, dark, light) {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = base;
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i += 1) {
    const r = 2 + Math.random() * 22;
    x.globalAlpha = 0.08 + Math.random() * 0.16;
    x.fillStyle = Math.random() > 0.5 ? dark : light;
    x.beginPath();
    x.ellipse(Math.random() * 256, Math.random() * 256, r, r * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
    x.fill();
  }
  // Craters (lunar) / rocks (martian): darker ellipse + bright rim
  for (let i = 0; i < 14; i += 1) {
    const cx = Math.random() * 256;
    const cy = Math.random() * 256;
    const r = 6 + Math.random() * 16;
    x.globalAlpha = 0.25;
    x.fillStyle = dark;
    x.beginPath();
    x.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2);
    x.fill();
    x.globalAlpha = 0.18;
    x.strokeStyle = light;
    x.lineWidth = 2;
    x.beginPath();
    x.ellipse(cx, cy - 1, r, r * 0.8, 0, Math.PI * 1.1, Math.PI * 1.9);
    x.stroke();
  }
  x.globalAlpha = 1;
  return toTexture(c);
}

function habitatTexture() {
  const [c, x] = makeCanvas(128, 64);
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, "#f4f6fb");
  g.addColorStop(0.6, "#c9d0e2");
  g.addColorStop(1, "#8d95ad");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 64);
  // panel seams
  x.globalAlpha = 0.25;
  x.strokeStyle = "#6a7290";
  x.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    x.beginPath();
    x.moveTo((128 / 6) * i, 0);
    x.lineTo((128 / 6) * i, 64);
    x.stroke();
  }
  x.globalAlpha = 1;
  return toTexture(c);
}

function earthTexture() {
  const [c, x] = makeCanvas(64, 64);
  x.fillStyle = "#1c5f9e";
  x.fillRect(0, 0, 64, 64);
  x.globalAlpha = 0.8;
  x.fillStyle = "#2e8a4e";
  for (let i = 0; i < 7; i += 1) {
    x.beginPath();
    x.ellipse(Math.random() * 64, 20 + Math.random() * 30, 5 + Math.random() * 8, 3 + Math.random() * 5, Math.random(), 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 0.85;
  x.fillStyle = "#ffffff";
  x.beginPath();
  x.ellipse(32, 4, 18, 5, 0, 0, Math.PI * 2);
  x.fill();
  x.globalAlpha = 0.25;
  x.fillStyle = "#0a2d52";
  x.fillRect(40, 0, 24, 64); // baked shadow side
  x.globalAlpha = 1;
  return toTexture(c);
}

function dustTexture() {
  const [c, x] = makeCanvas(32, 32);
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(233,170,105,0.9)");
  g.addColorStop(1, "rgba(233,170,105,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  return toTexture(c);
}

/* ---------- shared habitat builder ---------- */

function buildHabitat(low) {
  const group = new THREE.Group();
  const shellMat = new THREE.MeshBasicMaterial({ map: habitatTexture() });

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, low ? 14 : 22, low ? 7 : 11, 0, Math.PI * 2, 0, Math.PI / 2),
    shellMat
  );
  group.add(dome);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 2.2, 0.5, low ? 14 : 22),
    new THREE.MeshBasicMaterial({ color: 0x9aa2b8 })
  );
  base.position.y = -0.2;
  group.add(base);

  const airlock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.6, 1.5, low ? 8 : 12),
    new THREE.MeshBasicMaterial({ color: 0xb9c1d6 })
  );
  airlock.position.set(2.4, 0.55, 0.4);
  group.add(airlock);

  // Window strip — its color pulses when the habitat is critical.
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  const windowStrip = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.32, 0.08),
    windowMat
  );
  windowStrip.position.set(0, 1.05, 2.02);
  windowStrip.rotation.x = -0.32;
  group.add(windowStrip);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5),
    new THREE.MeshBasicMaterial({ color: 0xc9d0e2 })
  );
  mast.position.set(-1.7, 2.1, -0.6);
  group.add(mast);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x7deaf9 })
  );
  beacon.position.set(-1.7, 3.3, -0.6);
  group.add(beacon);

  return { group, windowMat, beaconMat: beacon.material };
}

/* ---------- environment builders ---------- */

function buildStars(count, radius) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    pos[i * 3] = (Math.random() - 0.5) * radius;
    pos[i * 3 + 1] = Math.random() * radius * 0.6;
    pos[i * 3 + 2] = -20 - Math.random() * radius * 0.8;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.35, color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false,
  }));
}

function buildEnvironment(key, low) {
  const group = new THREE.Group();
  const env = { group, fog: null, dustParticles: null, baseColor: new THREE.Color(0x05070f) };

  // Ground
  const isMars = key === "martian";
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshBasicMaterial({
      map: isMars
        ? groundTexture("#9a4a22", "#5c2812", "#c26a35")
        : groundTexture("#8d8fa0", "#4c4e5e", "#c6c9d6"),
    })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Habitat
  const hab = buildHabitat(low);
  hab.group.position.set(0, 0, 0);
  group.add(hab.group);
  env.windowMat = hab.windowMat;

  // Rocks
  const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
  const rockMat = new THREE.MeshBasicMaterial({
    color: isMars ? 0x7a3a1a : 0x63666f,
  });
  const rockCount = low ? 5 : 9;
  for (let i = 0; i < rockCount; i += 1) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const a = Math.random() * Math.PI * 2;
    const d = 5 + Math.random() * 14;
    rock.position.set(Math.cos(a) * d, 0.1 + Math.random() * 0.25, Math.sin(a) * d);
    rock.scale.setScalar(0.4 + Math.random() * 1.6);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(rock);
  }

  if (isMars) {
    env.baseColor = new THREE.Color(0x6e3a1c);
    // Butterscotch haze
    env.fog = new THREE.Fog(0x8a4a24, 10, 55);
    // Dust particles
    const count = low ? 60 : 140;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = 0.2 + Math.random() * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    env.dustParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.5,
      map: dustTexture(),
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }));
    group.add(env.dustParticles);
  } else {
    // Lunar night sky: stars + Earth
    group.add(buildStars(low ? 180 : 380, 80));
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, low ? 14 : 20, low ? 10 : 14),
      new THREE.MeshBasicMaterial({ map: earthTexture() })
    );
    earth.position.set(-8, 7, -22);
    group.add(earth);
  }

  return env;
}

/* ==========================================================================
   Main init
   ========================================================================== */

export function initExteriorView({ canvas, low = false, reducedMotion = false, onFallback }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "low-power",
    });
  } catch (err) {
    if (typeof onFallback === "function") onFallback(err);
    throw err;
  }
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 16 / 10, 0.1, 200);
  const cameraHome = new THREE.Vector3(4.2, 2.6, 8.5);
  camera.position.copy(cameraHome);
  camera.lookAt(0, 1.1, 0);

  let env = null;
  let envKey = null;

  /* ---- effect state: numeric targets, lerped per frame ---- */
  const fx = {
    dust: 0, radiation: 0, solar: 0, critical: 0, shake: 0,
  };
  const cur = { dust: 0, radiation: 0, solar: 0, critical: 0 };
  let shakeT = 0;

  function setEnvironment(key) {
    if (key === envKey) return;
    if (env) {
      scene.remove(env.group);
      env.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
    }
    envKey = key;
    env = buildEnvironment(key, low);
    scene.background = env.baseColor.clone();
    scene.fog = env.fog || null;
    scene.add(env.group);
    applyInstant();
  }

  function setEffects(next) {
    fx.dust = clamp01(next.dust || 0);
    fx.radiation = clamp01(next.radiation || 0);
    fx.solar = clamp01(next.solar || 0);
    fx.critical = clamp01(next.critical || 0);
    if (reducedMotion) applyInstant();
  }

  function shake() {
    shakeT = 1.1; // seconds of decay
    if (reducedMotion) shakeT = 0;
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  /** Apply every effect value instantly (reduced-motion path / env rebuild). */
  function applyInstant() {
    Object.assign(cur, { dust: fx.dust, radiation: fx.radiation, solar: fx.solar, critical: fx.critical });
    paint(1);
  }

  /* ---- per-frame visual painting (cheap, plain arithmetic) ---- */
  function paint(dt) {
    if (!env) return;

    // Sky/fog tint: base + dust brightening + solar teal + radiation red
    const bg = scene.background;
    bg.copy(env.baseColor);
    if (env.fog) {
      const f = env.fog;
      f.near = 10 - cur.dust * 8;
      f.far = 55 - cur.dust * 38;
      f.color.copy(bg);
    }
    // Dust brightens/hazes the sky
    bg.lerp(new THREE.Color(0x8a4a24), cur.dust * 0.65);
    // Solar storm: aurora-like teal shift with gentle flicker
    const solarFlicker = 0.8 + Math.sin(performance.now() * 0.004) * 0.2;
    bg.lerp(new THREE.Color(0x0e4a40), cur.solar * 0.4 * solarFlicker);
    // Radiation: subtle red shift
    bg.lerp(new THREE.Color(0x3a0d10), cur.radiation * 0.5);
    if (env.fog) env.fog.color.copy(bg);

    // Dust particles: opacity + drift
    if (env.dustParticles) {
      const mat = env.dustParticles.material;
      mat.opacity = 0.12 + cur.dust * 0.75;
      mat.size = 0.5 + cur.dust * 0.8;
      const pos = env.dustParticles.geometry.attributes.position;
      const speed = (0.6 + cur.dust * 2.4) * dt;
      for (let i = 0; i < pos.count; i += 1) {
        let x = pos.getX(i) + speed;
        if (x > 25) x = -25;
        pos.setX(i, x);
      }
      pos.needsUpdate = true;
    }

    // Critical: habitat window/beacon flashing orange-red
    if (env.windowMat) {
      const flash = 0.5 + Math.sin(performance.now() * 0.012) * 0.5;
      env.windowMat.color.setRGB(
        1,
        0.85 - cur.critical * (0.45 + flash * 0.35),
        0.55 - cur.critical * (0.4 + flash * 0.4)
      );
    }

    // Camera: home position + subtle breathing drift + quake shake
    const t = performance.now() * 0.0004;
    camera.position.set(
      cameraHome.x + Math.sin(t) * 0.35,
      cameraHome.y + Math.sin(t * 0.8) * 0.2,
      cameraHome.z + Math.cos(t) * 0.25
    );
    if (shakeT > 0) {
      shakeT = Math.max(0, shakeT - dt);
      const s = shakeT * 0.14;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
    camera.lookAt(0, 1.1, 0);
  }

  /* ---- sizing ---- */
  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth || 320;
    const h = parent.clientHeight || 200;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (reducedMotion) renderer.render(scene, camera);
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---- loop (30 fps cap) + watchdog ---- */
  let rafId = 0;
  let last = performance.now();
  let acc = 0;
  let frames = 0;
  let fpsAcc = 0;
  let lowSamples = 0;
  let running = false;

  function tick(now) {
    rafId = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    acc += dt;

    // Lerp current effect values toward targets
    const k = Math.min(1, dt * 3);
    cur.dust += (fx.dust - cur.dust) * k;
    cur.radiation += (fx.radiation - cur.radiation) * k;
    cur.solar += (fx.solar - cur.solar) * k;
    cur.critical += (fx.critical - cur.critical) * k;

    if (acc >= 1 / FPS_LIMIT) {
      paint(acc);
      renderer.render(scene, camera);
      acc = 0;
    }

    // Watchdog
    frames += 1;
    fpsAcc += dt;
    if (fpsAcc >= 2) {
      const fps = frames / fpsAcc;
      frames = 0;
      fpsAcc = 0;
      lowSamples = fps < WATCHDOG_FPS ? lowSamples + 1 : 0;
      if (lowSamples >= 2) {
        stop();
        if (typeof onFallback === "function") onFallback(new Error("low fps"));
      }
    }
  }

  function start() {
    if (running || reducedMotion) return;
    running = true;
    last = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  function dispose() {
    stop();
    window.removeEventListener("resize", resize);
    if (env) {
      scene.remove(env.group);
      env.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
      env = null;
    }
    renderer.dispose();
  }

  if (reducedMotion) {
    // Static: paint once per state change via applyInstant()/resize().
    renderer.render(scene, camera);
  }

  return { setEnvironment, setEffects, shake, resize, start, stop, dispose };
}
