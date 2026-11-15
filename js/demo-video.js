/**
 * demo-video.js — the "Demo" screen: a short illustrated movie that explains
 * ASTROCOMMAND to kids aged 7+.
 *
 * How it works (no video file, no CDN, no libraries):
 *   - 12 scenes, each an SVG picture from assets/images/demo-*.svg
 *   - a friendly narrator: the browser's built-in speech (SpeechSynthesis)
 *   - big word-by-word captions, so it still works with the sound off
 *   - controls: play/pause, previous/next, watch again, voice on/off, slow/normal
 *
 * Additive module: it only touches #screen-demo. It never reads or writes the
 * game state, mission saves or Academy progress.
 *
 * ⚠️ Science note: every sentence below matches what the game actually does.
 *    The game's numbers are simplified play values, not real NASA data, and
 *    the page says so.
 */
(() => {
  "use strict";

  const IMG = "assets/images/";

  /** One entry per scene. `text` is both the caption and the narration. */
  const SCENES = [
    {
      img: "demo-01-welcome.svg", title: "Hello, Cadet!",
      alt: "Astro the astronaut waves hello in front of planet Earth.",
      text: "Hi, space cadet! I'm Astro the astronaut. Welcome to Astro Command! Let me show you how this game works.",
    },
    {
      img: "demo-02-your-job.svg", title: "Your job",
      alt: "A glass dome home on the Moon with four astronauts and seven days to go.",
      text: "In this game, you are the boss of a space home on the Moon or on Mars. Your job is to keep your crew safe for seven days.",
    },
    {
      img: "demo-03-no-air.svg", title: "Space is tricky",
      alt: "An astronaut with an air tank. Space has no air, no water tap and no food shop.",
      text: "But space is tricky! There is no air to breathe, no water tap, and no food shop. So the crew has to make and save everything they need.",
    },
    {
      img: "demo-04-academy.svg", title: "Astronaut Academy",
      alt: "Four Academy missions: suit up, launch, float, and the space station. Each can earn three stars.",
      text: "First, visit Astronaut Academy. You will do four small missions: put on a spacesuit, launch a rocket, float in space, and visit the space station. Every mission can win you stars!",
    },
    {
      img: "demo-05-falling.svg", title: "Why we float",
      alt: "A ball thrown harder and harder keeps missing the ground and circles Earth like the space station.",
      text: "Did you know astronauts float because they are falling around Earth? Throw a ball harder and harder, and it keeps missing the ground. Gravity is still there!",
    },
    {
      img: "demo-06-moon-mars.svg", title: "Moon or Mars?",
      alt: "The Moon with four astronauts is easier. Mars with six astronauts is harder.",
      text: "Next, become a Master Commander! Pick the Moon, with four astronauts, or Mars, with six. Mars is harder, so the Moon is a great place to start.",
    },
    {
      img: "demo-07-gauges.svg", title: "Your dashboard",
      alt: "Four gauges: air, water, food and power. Keep every one above zero.",
      text: "Now look at your dashboard. Watch four big things: air, water, food, and power. Keep every one above zero, and your crew stays safe and healthy.",
    },
    {
      img: "demo-08-radiation.svg", title: "Sun rays",
      alt: "The Sun sends strong rays called radiation. A shield protects the home.",
      text: "Watch out for radiation. It is like sun rays that are too strong. Too many can make astronauts sick, so keep your shield strong.",
    },
    {
      img: "demo-09-actions.svg", title: "Your actions",
      alt: "Three action points each day to make air, clean water or grow food, then press Advance Day.",
      text: "Each day you get three action points. Use them to make air, clean water, or grow food. Then press Advance Day, and a new day begins.",
    },
    {
      img: "demo-10-emergency.svg", title: "Emergency!",
      alt: "A Moonquake alert with three choices, each showing what it costs.",
      text: "Sometimes an emergency pops up! Read each choice carefully. The game shows you what each choice costs before you pick.",
    },
    {
      img: "demo-11-tradeoff.svg", title: "No free choices",
      alt: "A seesaw: making air gives plus fifteen air but costs ten power.",
      text: "Here is the secret: no choice is free! Making air uses power. Power does not last forever, so think before you tap.",
    },
    {
      img: "demo-12-stars.svg", title: "Win stars!",
      alt: "Astro gives a thumbs up with three stars. Survive seven days to win a score.",
      text: "Survive all seven days to win stars and a score. If it goes wrong, don't worry. Just try again! Now press Academy, and start your adventure. Ready? Let's go!",
    },
  ];

  const root = document.getElementById("screen-demo");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const el = {
    img: $("demo-img"), badge: $("demo-badge"), chip: $("demo-chip"),
    big: $("demo-bigplay"), title: $("demo-scene-title"), text: $("demo-text"),
    fill: $("demo-fill"), play: $("demo-play"), prev: $("demo-prev"),
    next: $("demo-next"), voice: $("demo-voice"), speed: $("demo-speed"),
    scenes: $("demo-scenes"), player: $("demo-player"), bar: $("demo-bar"),
  };
  if (!el.img || !el.text || !el.play) return;

  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  const canSpeak = !!synth && typeof window.SpeechSynthesisUtterance === "function";

  const state = {
    idx: 0,
    playing: false,
    ended: false,
    voiceOn: canSpeak,
    slow: false,
    done: new Set(),
  };

  let timers = [];            // every pending timeout/interval for the current scene
  let token = 0;              // bumps whenever playback is cancelled, ignoring late callbacks
  let words = [];             // caption word <span>s of the current scene
  let sceneStart = 0;
  let sceneDur = 6;

  /* ---------------------------------------------------------------- helpers */

  const wordCount = (s) => s.trim().split(/\s+/).length;
  const rate = () => (state.slow ? 0.75 : 0.92);

  /** Seconds a scene should last when read at the current speed. */
  function estimate(scene) {
    const wps = state.slow ? 1.8 : 2.4;
    return wordCount(scene.text) / wps + 1.4;
  }

  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function every(fn, ms) {
    const id = setInterval(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers() {
    timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    timers = [];
  }
  function stopSpeech() {
    token += 1;
    if (canSpeak) { try { synth.cancel(); } catch { /* ignore */ } }
  }

  function pickVoice() {
    if (!canSpeak) return null;
    const list = synth.getVoices().filter((v) => /^en/i.test(v.lang));
    if (!list.length) return null;
    const nice = /(Google US English|Samantha|Aria|Jenny|Zira|Natural|Female|Karen|Moira|Tessa)/i;
    return list.find((v) => nice.test(v.name)) || list.find((v) => /en[-_]US/i.test(v.lang)) || list[0];
  }
  if (canSpeak && synth.addEventListener) synth.addEventListener("voiceschanged", () => {});

  /* ----------------------------------------------------------------- render */

  function renderScene(i) {
    const s = SCENES[i];
    state.idx = i;

    el.img.classList.remove("is-entering");
    // restart the entrance animation
    void el.img.offsetWidth;
    el.img.src = IMG + s.img;
    el.img.alt = s.alt;
    el.img.classList.add("is-entering");

    el.badge.textContent = `Scene ${i + 1} of ${SCENES.length}`;
    el.title.textContent = s.title;

    el.text.textContent = "";
    words = s.text.split(" ").map((w, k, arr) => {
      const span = document.createElement("span");
      span.className = "demo__word";
      span.textContent = w + (k < arr.length - 1 ? " " : "");
      el.text.appendChild(span);
      return span;
    });

    el.prev.disabled = i === 0;
    el.next.disabled = i === SCENES.length - 1;
    el.scenes.querySelectorAll(".demo-thumb").forEach((b, k) => {
      b.classList.toggle("is-active", k === i);
      b.classList.toggle("is-done", state.done.has(k));
      b.setAttribute("aria-current", k === i ? "true" : "false");
    });
    setFill(i / SCENES.length);
  }

  function setFill(frac) {
    const pct = Math.max(0, Math.min(1, frac)) * 100;
    el.fill.style.width = pct.toFixed(1) + "%";
    el.bar.setAttribute("aria-valuenow", String(Math.round(pct)));
  }

  function highlight(n) {
    words.forEach((w, k) => {
      w.classList.toggle("is-on", k <= n);
      w.classList.toggle("is-now", k === n);
    });
  }

  function syncButtons() {
    el.play.textContent = state.playing ? "⏸ Pause" : state.ended ? "↺ Watch again" : (state.idx === 0 && !state.done.size ? "▶ Play" : "▶ Resume");
    el.play.setAttribute("aria-label", state.playing ? "Pause the demo" : "Play the demo");
    el.big.hidden = state.playing;
    el.big.textContent = state.ended ? "↺ Watch again" : (state.done.size || state.idx > 0 ? "▶ Keep watching" : "▶ Watch the demo");
    el.voice.setAttribute("aria-pressed", String(state.voiceOn));
    el.voice.textContent = state.voiceOn ? "🔊 Voice on" : "🔇 Voice off";
    el.voice.disabled = !canSpeak;
    if (!canSpeak) el.voice.title = "Your browser can't read aloud — the captions still work!";
    el.speed.setAttribute("aria-pressed", String(state.slow));
    el.speed.textContent = state.slow ? "🐢 Slow" : "🐇 Normal";
  }

  /* --------------------------------------------------------------- playback */

  function startScene(i) {
    clearTimers();
    stopSpeech();
    const my = token;
    renderScene(i);
    const scene = SCENES[i];
    sceneStart = performance.now();
    sceneDur = estimate(scene);
    state.ended = false;

    // karaoke-style highlight: timed by default, corrected by speech boundaries
    let boundarySeen = false;
    let n = -1;
    every(() => {
      if (boundarySeen) return;
      const frac = (performance.now() - sceneStart) / 1000 / (sceneDur - 1.0);
      const target = Math.min(words.length - 1, Math.floor(frac * words.length));
      if (target !== n && target >= 0) { n = target; highlight(n); }
    }, 120);

    // smooth progress bar
    every(() => {
      const f = Math.min(0.97, (performance.now() - sceneStart) / 1000 / sceneDur);
      setFill((i + f) / SCENES.length);
    }, 200);

    const finish = () => { if (my === token && state.playing) sceneDone(); };

    let speaking = false;
    if (state.voiceOn && canSpeak) {
      const u = new SpeechSynthesisUtterance(scene.text);
      u.lang = "en-US";
      u.rate = rate();
      u.pitch = 1.08;
      const v = pickVoice();
      if (v) u.voice = v;

      // map each word to its character offset for exact highlighting
      const offsets = [];
      let pos = 0;
      scene.text.split(" ").forEach((w) => { offsets.push(pos); pos += w.length + 1; });

      u.onstart = () => { speaking = true; };
      u.onboundary = (e) => {
        if (my !== token || typeof e.charIndex !== "number") return;
        boundarySeen = true;
        let k = 0;
        while (k + 1 < offsets.length && offsets[k + 1] <= e.charIndex) k += 1;
        n = k;
        highlight(k);
      };
      u.onend = () => { if (my === token) { highlight(words.length - 1); later(finish, 700); } };
      u.onerror = (e) => {
        if (my !== token || e.error === "canceled" || e.error === "interrupted") return;
        // The voice failed (e.g. no speech voice installed). Keep the captions
        // going for the normal reading time instead of skipping the scene.
        speaking = true;                       // stop the "never started" watchdog below
        boundarySeen = false;
        const left = Math.max(600, sceneDur * 1000 - (performance.now() - sceneStart));
        later(finish, left);
      };
      try { synth.speak(u); } catch { /* fall through to timed mode */ }

      // If speech never starts (blocked or no voices), quietly switch to timed captions.
      later(() => {
        if (my !== token || speaking) return;
        stopSpeech();
        const my2 = token;
        later(() => { if (my2 === token && state.playing) sceneDone(); }, Math.max(500, sceneDur * 1000 - 1500));
      }, 1800);
      // Safety net so a stuck voice can never freeze the movie.
      later(finish, sceneDur * 2200 + 4000);
    } else {
      later(finish, sceneDur * 1000 + 600);
    }
  }

  function sceneDone() {
    state.done.add(state.idx);
    highlight(words.length - 1);
    if (state.idx < SCENES.length - 1) {
      later(() => { if (state.playing) startScene(state.idx + 1); }, 450);
    } else {
      finishMovie();
    }
  }

  function finishMovie() {
    clearTimers();
    stopSpeech();
    state.playing = false;
    state.ended = true;
    setFill(1);
    renderSceneKeepText();
    syncButtons();
  }

  /** Re-mark thumbnails at the end without restarting the scene animation. */
  function renderSceneKeepText() {
    el.scenes.querySelectorAll(".demo-thumb").forEach((b, k) => {
      b.classList.toggle("is-done", state.done.has(k));
    });
  }

  function play() {
    if (state.ended) { state.done.clear(); state.idx = 0; }
    state.playing = true;
    state.ended = false;
    syncButtons();
    startScene(state.idx);
  }

  function pause() {
    if (!state.playing) return;
    state.playing = false;
    clearTimers();
    stopSpeech();
    syncButtons();
  }

  function go(i) {
    const k = Math.max(0, Math.min(SCENES.length - 1, i));
    state.ended = false;
    if (state.playing) startScene(k);
    else { clearTimers(); stopSpeech(); renderScene(k); highlight(words.length - 1); syncButtons(); }
  }

  /* --------------------------------------------------------------- wire up */

  SCENES.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "demo-thumb";
    b.setAttribute("aria-label", `Scene ${i + 1}: ${s.title}`);
    b.innerHTML = `<img src="${IMG}${s.img}" alt="" loading="lazy" /><span class="demo-thumb__n">${i + 1}</span>`;
    b.addEventListener("click", () => { go(i); });
    el.scenes.appendChild(b);
  });

  const toggle = () => (state.playing ? pause() : play());
  el.play.addEventListener("click", toggle);
  el.big.addEventListener("click", play);
  el.prev.addEventListener("click", () => go(state.idx - 1));
  el.next.addEventListener("click", () => go(state.idx + 1));
  el.voice.addEventListener("click", () => {
    state.voiceOn = !state.voiceOn;
    syncButtons();
    if (state.playing) startScene(state.idx);   // re-read this scene with/without voice
  });
  el.speed.addEventListener("click", () => {
    state.slow = !state.slow;
    syncButtons();
    if (state.playing) startScene(state.idx);
  });

  document.addEventListener("keydown", (e) => {
    if (!root.classList.contains("screen--active")) return;
    const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(state.idx + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(state.idx - 1); }
    else if ((e.key === " " || e.key === "k") && !(t && t.tagName === "BUTTON")) { e.preventDefault(); toggle(); }
  });

  // Stop the movie (and the voice) whenever the child leaves this screen or the tab.
  new MutationObserver(() => {
    if (!root.classList.contains("screen--active")) pause();
  }).observe(root, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  window.addEventListener("pagehide", stopSpeech);

  // First frame
  const total = SCENES.reduce((sum, s) => sum + estimate(s) + 0.45, 0);
  el.chip.textContent = `≈ ${Math.max(1, Math.round(total / 60))} min`;
  renderScene(0);
  syncButtons();

  // Exposed for debugging and automated tests.
  window.DemoVideo = { scenes: SCENES, state, play, pause, go };
})();
