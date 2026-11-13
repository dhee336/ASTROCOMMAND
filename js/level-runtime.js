/**
 * level-runtime.js — Phase B: generic player for Academy tutorial levels.
 *
 * Takes a level definition (LEVELS metadata + ACADEMY_LEVELS content) and
 * runs it as a guided, kid-friendly experience:
 *
 *   story intro  → one activity at a time → complete panel with stars
 *
 * Design rules (ages 7–12):
 *   - ONE instruction at a time, always visible in the guide bubble.
 *   - Every decision shows its consequence immediately (outcome panel).
 *   - Unlimited retries: wrong answers never end the level, they only
 *     count as "misses" for the star rating (1–3 stars, never 0).
 *   - Everything is a real <button>: full keyboard + mouse support.
 *   - No GSAP / Three.js required — all hooks are optional-chained.
 *
 * Activity types implemented (see academy-levels.js):
 *   dragdrop — tap item, tap target (works with keyboard too)
 *   select   — big option buttons (optionally with a rocket scene)
 *   order    — tap steps in the right order
 *   explore  — station hotspots / orbit throw experiment
 */
const LevelRuntime = (() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  /* ---------- state ---------- */

  let els = null;
  let levelId = null;   // e.g. "academy-3"
  let meta = null;      // LEVELS metadata (title, icon, concept…)
  let cfg = null;       // ACADEMY_LEVELS content (intro, steps…)
  let phase = "idle";   // intro | step | complete
  let introIndex = 0;
  let stepIndex = 0;
  let misses = 0;
  let completed = new Set();  // step indexes finished (for progress dots)
  let stepState = null;       // transient per-activity state
  let outcomeAction = null;   // callback for the outcome panel button

  /* ---------- tiny helpers ---------- */

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function say(text) {
    if (els && els.speech) els.speech.textContent = text;
  }

  /** Per-activity-type helper line for the guide bubble. */
  const TYPE_HINTS = {
    dragdrop: "Tap a thing, then tap where it goes!",
    select: "Pick an answer — you can always try again!",
    order: "Tap the steps in the right order!",
    explore: "Tap things to discover cool space facts!",
  };

  /* ---------- outcome panel (shared consequence display) ---------- */

  /**
   * kind: "ok" (green) | "bad" (warm retry color)
   * btnLabel + onBtn: what the single big button does ("Next ▶", "Try Again"…)
   * science: optional 1–2 sentence chip with the real science.
   */
  function showOutcome(kind, text, btnLabel, onBtn, science) {
    els.outcome.classList.remove("hidden", "level-outcome--ok", "level-outcome--bad");
    els.outcome.classList.add(`level-outcome--${kind}`);
    els.outcomeIcon.textContent = kind === "ok" ? "✅" : "🤔";
    els.outcomeText.textContent = text;
    if (science) {
      els.outcomeScience.textContent = science;
      els.outcomeScience.classList.remove("hidden");
    } else {
      els.outcomeScience.classList.add("hidden");
    }
    els.outcomeBtn.textContent = btnLabel;
    outcomeAction = onBtn;
    window.Sound?.play(kind === "ok" ? "success" : "fail");
  }

  function hideOutcome() {
    els.outcome.classList.add("hidden");
    outcomeAction = null;
  }

  /* ---------- progress dots ---------- */

  function renderProgress() {
    const total = cfg.steps.length;
    let html = "";
    for (let i = 0; i < total; i += 1) {
      const cls = completed.has(i) ? " done" : i === stepIndex && phase === "step" ? " now" : "";
      html += `<span class="level-dot${cls}" aria-hidden="true"></span>`;
    }
    els.progress.innerHTML = html;
  }

  /* ---------- story intro ---------- */

  function renderIntro() {
    phase = "intro";
    stepState = null;
    hideOutcome();
    renderProgress();
    const frame = cfg.intro[introIndex];
    say(cfg.guide);
    els.stage.innerHTML = `
      <div class="level-story" role="group" aria-label="Level story">
        <div class="level-story__scene" aria-hidden="true">${frame.scene}</div>
        <p class="level-story__text">${frame.text}</p>
        <p class="level-story__page">${introIndex + 1} / ${cfg.intro.length}</p>
        <button id="story-next" class="btn btn--primary btn--lg" type="button">
          ${introIndex + 1 < cfg.intro.length ? "Next ▶" : "Let's go! 🚀"}
        </button>
      </div>`;
    $("story-next").addEventListener("click", () => {
      window.Sound?.play("click");
      if (introIndex + 1 < cfg.intro.length) {
        introIndex += 1;
        renderIntro();
      } else {
        stepIndex = 0;
        renderStep();
      }
    });
  }

  /* ---------- step dispatcher ---------- */

  function renderStep() {
    phase = "step";
    hideOutcome();
    renderProgress();
    const step = cfg.steps[stepIndex];
    say(TYPE_HINTS[step.type] || cfg.guide);
    els.heading.textContent = step.instruction;
    els.counter.textContent = `Activity ${stepIndex + 1} of ${cfg.steps.length}`;

    if (step.type === "dragdrop") renderDragdrop(step);
    else if (step.type === "select") renderSelect(step);
    else if (step.type === "order") renderOrder(step);
    else if (step.type === "explore") renderExplore(step);
    else nextStep(); // unknown type: skip safely
  }

  function stepDone() {
    completed.add(stepIndex);
    renderProgress();
  }

  function nextStep() {
    stepDone();
    if (stepIndex + 1 < cfg.steps.length) {
      stepIndex += 1;
      renderStep();
    } else {
      renderComplete();
    }
  }

  /* ---------- activity: dragdrop (tap item → tap target) ---------- */

  function renderDragdrop(step) {
    stepState = { selected: -1, placed: 0 };
    const shuffledItems = shuffle(step.items);
    const targets = step.targets
      .map(
        (t) => `
        <button class="dd-target" type="button" data-target="${t.id}">
          <span class="dd-target__slot" aria-hidden="true">❔</span>
          <span class="dd-target__name">${t.name}</span>
        </button>`
      )
      .join("");
    const items = shuffledItems
      .map(
        (item, i) => `
        <button class="dd-item" type="button" data-item="${i}" aria-pressed="false">
          <span class="dd-item__emoji" aria-hidden="true">${item.emoji}</span>
          <span class="dd-item__name">${item.name}</span>
        </button>`
      )
      .join("");

    els.stage.innerHTML = `
      <div class="dd-layout">
        <div class="dd-targets" role="group" aria-label="Suit slots">${targets}</div>
        <div class="dd-tray" role="group" aria-label="Things to pack">${items}</div>
      </div>`;

    const itemBtns = [...els.stage.querySelectorAll(".dd-item")];
    const targetBtns = [...els.stage.querySelectorAll(".dd-target")];
    const itemsData = shuffledItems;

    itemBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        window.Sound?.play("click");
        stepState.selected = Number(btn.dataset.item);
        itemBtns.forEach((b) => {
          b.classList.toggle("dd-item--picked", b === btn);
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        say(`Now tap where the ${itemsData[stepState.selected].name} goes!`);
      });
    });

    targetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (stepState.selected < 0) {
          say("First tap a thing below, then tap where it goes!");
          return;
        }
        if (btn.classList.contains("dd-target--filled")) {
          say("That spot is already packed!");
          return;
        }
        const item = itemsData[stepState.selected];
        const itemBtn = itemBtns[stepState.selected];
        if (item.correct && item.target === btn.dataset.target) {
          // Correct fit: snap it in.
          btn.classList.add("dd-target--filled");
          btn.querySelector(".dd-target__slot").textContent = item.emoji;
          itemBtn.disabled = true;
          itemBtn.classList.remove("dd-item--picked");
          itemBtn.classList.add("dd-item--used");
          stepState.placed += 1;
          stepState.selected = -1;
          if (stepState.placed < step.targets.length) {
            showOutcome("ok", item.why, "Keep Going ▶", hideOutcome, step.science);
            // Science chip only on the last placement, why-line on each:
            els.outcomeScience.classList.add("hidden");
          } else {
            showOutcome("ok", item.why, "Next ▶", nextStep, step.science);
          }
        } else if (!item.correct) {
          misses += 1;
          showOutcome("bad", item.rejectWhy || "That won't help in space!", "Try Again ▶", hideOutcome);
          itemBtn.classList.remove("dd-item--picked");
          itemBtn.setAttribute("aria-pressed", "false");
          stepState.selected = -1;
        } else {
          misses += 1;
          showOutcome(
            "bad",
            `Hmm — the ${item.name} doesn't go there. Where does it really belong?`,
            "Try Again ▶",
            hideOutcome
          );
          itemBtn.classList.remove("dd-item--picked");
          itemBtn.setAttribute("aria-pressed", "false");
          stepState.selected = -1;
        }
      });
    });
  }

  /* ---------- activity: select (with optional rocket scene) ---------- */

  function renderSelect(step) {
    stepState = {};
    const scene = step.scene === "rocket" ? `<div class="rocket-scene"><div class="rocket-scene__earth" aria-hidden="true">🌍</div><div id="rocket-ship" class="rocket-scene__ship" aria-hidden="true">🚀</div><div class="rocket-scene__pad" aria-hidden="true"></div></div>` : "";
    const shuffledOptions = shuffle(step.options);
    const options = shuffledOptions
      .map(
        (o, i) => `
        <button class="option-btn" type="button" data-opt="${i}">
          <span class="option-btn__emoji" aria-hidden="true">${o.emoji}</span>
          <span class="option-btn__label">${o.label}</span>
        </button>`
      )
      .join("");

    els.stage.innerHTML = `
      ${scene}
      <div class="option-grid" role="group" aria-label="Choices">${options}</div>`;

    els.stage.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.Sound?.play("click");
        const opt = shuffledOptions[Number(btn.dataset.opt)];
        if (opt.correct) {
          if (opt.anim) playRocketAnim(opt.anim);
          showOutcome("ok", "Great choice!", "Next ▶", nextStep, opt.science);
        } else {
          misses += 1;
          if (opt.anim) playRocketAnim(opt.anim);
          showOutcome("bad", opt.response || "Not quite — try again!", "Try Again ▶", hideOutcome);
        }
      });
    });
  }

  /** Rocket scene feedback: "flop" (falls back) or "launch" (flies away). */
  function playRocketAnim(anim) {
    const ship = $("rocket-ship");
    if (!ship) return;
    ship.classList.remove("anim-flop", "anim-launch");
    void ship.offsetWidth; // restart animation
    ship.classList.add(anim);
  }

  /* ---------- activity: order (tap steps in the right order) ---------- */

  function renderOrder(step) {
    stepState = { next: 0 };
    const slots = step.items.map(() => `<span class="order-slot" aria-hidden="true"></span>`).join("");
    const shuffledSteps = shuffle(step.items);
    const items = shuffledSteps
      .map(
        (item, i) => `
        <button class="order-item" type="button" data-item="${i}">
          <span class="order-item__emoji" aria-hidden="true">${item.emoji}</span>
          <span class="order-item__name">${item.name}</span>
        </button>`
      )
      .join("");

    els.stage.innerHTML = `
      <div class="order-sequence" role="group" aria-label="Your order">${slots}</div>
      <div class="order-pool" role="group" aria-label="Steps to order">${items}</div>`;

    const itemBtns = [...els.stage.querySelectorAll(".order-item")];
    const slotsEls = [...els.stage.querySelectorAll(".order-slot")];

    itemBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        window.Sound?.play("click");
        const item = shuffledSteps[Number(btn.dataset.item)];
        const pos = step.items.indexOf(item);
        if (pos === stepState.next) {
          // Correct next step: snap it into the sequence.
          slotsEls[stepState.next].textContent = item.emoji;
          slotsEls[stepState.next].classList.add("order-slot--filled");
          btn.disabled = true;
          btn.classList.add("order-item--used");
          stepState.next += 1;
          if (stepState.next < step.items.length) {
            showOutcome("ok", item.why, "Keep Going ▶", hideOutcome);
          } else {
            showOutcome("ok", item.why, "Next ▶", nextStep, step.science);
          }
        } else {
          misses += 1;
          showOutcome(
            "bad",
            `Not yet! "${item.name}" comes ${pos > stepState.next ? "later" : "earlier"}. Check the order!`,
            "Try Again ▶",
            hideOutcome
          );
        }
      });
    });
  }

  /* ---------- activity: explore (station map / orbit demo) ---------- */

  function renderExplore(step) {
    stepState = {};
    if (step.layout === "station") renderStationExplore(step);
    else if (step.layout === "orbit") renderOrbitExplore(step);
    else nextStep();
  }

  function renderStationExplore(step) {
    stepState = { found: 0 };
    const hotspots = shuffle(step.hotspots)
      .map(
        (h, i) => `
        <button class="hotspot" type="button" data-spot="${i}">
          <span class="hotspot__emoji" aria-hidden="true">${h.emoji}</span>
          <span class="hotspot__label">${h.label}</span>
        </button>`
      )
      .join("");

    els.stage.innerHTML = `
      <div class="station-map" role="group" aria-label="Space station rooms">${hotspots}</div>
      <div id="level-fact" class="level-fact hidden" aria-live="polite"></div>`;

    els.stage.querySelectorAll(".hotspot").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.Sound?.play("click");
        const spot = step.hotspots[Number(btn.dataset.spot)];
        const fact = $("level-fact");
        fact.textContent = spot.fact;
        fact.classList.remove("hidden");
        if (!btn.classList.contains("hotspot--found")) {
          btn.classList.add("hotspot--found");
          stepState.found += 1;
        }
        if (stepState.found >= step.hotspots.length) {
          showOutcome("ok", "You explored the whole station!", "Next ▶", nextStep, step.science);
        }
      });
    });
  }

  function renderOrbitExplore(step) {
    stepState = { throws: 0 };
    els.stage.innerHTML = `
      <div class="orbit-stage" aria-label="Throw the ball experiment">
        <div class="orbit-stage__world" aria-hidden="true">
          <span class="orbit-stage__earth">🌍</span>
          <span class="orbit-stage__figure">🧑‍🚀</span>
          <span id="orbit-ball" class="orbit-stage__ball">⚽</span>
        </div>
        <button id="orbit-throw" class="btn btn--primary btn--lg" type="button">Throw! 💪 (1 / 3)</button>
        <div id="level-fact" class="level-fact hidden" aria-live="polite"></div>
      </div>`;

    const ball = $("orbit-ball");
    const throwBtn = $("orbit-throw");
    // Landing spots for each throw: farther each time; the last one "never lands".
    const spots = [
      "translate(34px, 66px) scale(0.8)",
      "translate(110px, 84px) scale(0.6)",
      "translate(240px, -40px) scale(0.45)",
    ];

    throwBtn.addEventListener("click", () => {
      window.Sound?.play("action");
      const n = stepState.throws;
      ball.style.transform = spots[n];
      ball.classList.add("orbit-stage__ball--flying");
      if (n === 2) ball.classList.add("orbit-stage__ball--orbiting");
      stepState.throws += 1;
      const fact = $("level-fact");
      fact.textContent = step.throws[n];
      fact.classList.remove("hidden");
      if (stepState.throws >= step.throws.length) {
        throwBtn.disabled = true;
        throwBtn.textContent = "Amazing! 🛰️";
        showOutcome("ok", "The ball is orbiting — just like the space station!", "Next ▶", nextStep, step.science);
      } else {
        throwBtn.textContent = `Throw! 💪 (${stepState.throws + 1} / 3)`;
      }
    });
  }

  /* ---------- complete panel (stars + recap + next) ---------- */

  /** 0–1 misses → ⭐⭐⭐, 2 → ⭐⭐, 3+ → ⭐ (finishing always earns ≥ 1). */
  function calcStars() {
    if (misses <= 1) return 3;
    if (misses === 2) return 2;
    return 1;
  }

  function renderComplete() {
    phase = "complete";
    hideOutcome();
    els.heading.textContent = "";
    els.counter.textContent = "";

    const stars = calcStars();
    window.Progression?.recordLevel(levelId, stars); // no score for tutorials
    window.Sound?.play("success");

    let starHtml = "";
    for (let i = 0; i < 3; i += 1) {
      starHtml += `<span class="level-bigstar${i < stars ? " level-bigstar--earned" : ""}" aria-hidden="true">⭐</span>`;
    }

    // Celebration: did the child just finish the whole section?
    let celebration = "";
    const section = LEVELS.getSection(metaSectionId());
    if (section && window.Progression && Progression.isSectionComplete(section.id)) {
      celebration = `
        <p class="level-celebrate">🎉 You finished <strong>${section.name}</strong>!
        The next adventure is unlocked on the Academy map!</p>`;
    }

    // What comes next?
    const next = nextLevelInsection();
    const nextBtn = next
      ? `<button id="level-next" class="btn btn--primary btn--lg" type="button">Next Level ▶</button>`
      : `<button id="level-next" class="btn btn--primary btn--lg" type="button">Back to Academy 🏠</button>`;

    els.stage.innerHTML = `
      <div class="level-complete">
        <p class="level-complete__kicker">MISSION COMPLETE</p>
        <h3 class="level-complete__title">${meta.icon} ${meta.title}</h3>
        <div class="level-complete__stars" role="img" aria-label="${stars} of 3 stars">${starHtml}</div>
        <p class="level-complete__outro">${cfg.outro}</p>
        <p class="level-complete__concept">💡 ${meta.concept}</p>
        ${celebration}
        <div class="level-complete__actions">
          <button id="level-replay" class="btn btn--ghost btn--lg" type="button">🔁 Play Again</button>
          ${nextBtn}
        </div>
      </div>`;

    $("level-replay").addEventListener("click", () => {
      window.Sound?.play("click");
      open(levelId);
    });
    $("level-next").addEventListener("click", () => {
      window.Sound?.play("click");
      if (next) open(next.id);
      else exit();
    });

    say(stars === 3 ? "PERFECT, Commander! You barely missed a thing! 🎉" : stars === 2 ? "Great job! Try again for 3 stars if you like! ⭐" : "You finished! Try again to earn more stars! 💪");
    renderProgress();
  }

  function metaSectionId() {
    for (const s of LEVELS.allSections()) {
      if (s.levels.some((l) => l.id === levelId)) return s.id;
    }
    return null;
  }

  /** Next level in the same section, if any. */
  function nextLevelInsection() {
    const section = LEVELS.getSection(metaSectionId());
    if (!section) return null;
    const idx = section.levels.findIndex((l) => l.id === levelId);
    return idx >= 0 && idx + 1 < section.levels.length ? section.levels[idx + 1] : null;
  }

  /* ---------- lifecycle ---------- */

  function exit() {
    hideOutcome();
    window.App?.showScreen("screen-section");
  }

  /**
   * Open a level by id. Returns true when the level started.
   * Merges LEVELS metadata with ACADEMY_LEVELS content.
   */
  function open(id) {
    if (typeof LEVELS === "undefined" || typeof ACADEMY_LEVELS === "undefined") return false;
    const m = LEVELS.findLevel(id);
    const c = ACADEMY_LEVELS[id];
    if (!m || !c || m.status !== "ready") return false;

    levelId = id;
    meta = m;
    cfg = c;
    phase = "idle";
    introIndex = 0;
    stepIndex = 0;
    misses = 0;
    completed = new Set();
    stepState = null;

    els.title.textContent = `${m.icon} ${m.title}`;
    els.heading.textContent = "";
    els.counter.textContent = "";
    els.stage.innerHTML = "";

    window.App?.showScreen("screen-level");
    renderIntro();
    return true;
  }

  /* ---------- wiring ---------- */

  function init() {
    els = {
      stage: $("level-stage"),
      speech: $("level-speech"),
      heading: $("level-heading"),
      counter: $("level-counter"),
      progress: $("level-progress"),
      title: $("level-title"),
      outcome: $("level-outcome"),
      outcomeIcon: $("level-outcome-icon"),
      outcomeText: $("level-outcome-text"),
      outcomeScience: $("level-outcome-science"),
      outcomeBtn: $("level-outcome-btn"),
    };
    if (!els.stage) return;

    $("level-back").addEventListener("click", () => {
      window.Sound?.play("click");
      exit();
    });
    els.outcomeBtn.addEventListener("click", () => {
      window.Sound?.play("click");
      if (typeof outcomeAction === "function") outcomeAction();
    });

    // Keyboard: Escape exits the level back to its section.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("screen-level").classList.contains("screen--active")) {
        exit();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  return { open, get misses() { return misses; }, get stars() { return calcStars(); } };
})();

// Expose for console debugging and automated testing.
window.LevelRuntime = LevelRuntime;
