/**
 * academy.js — Phase A: the Academy hub (default landing screen).
 *
 * Kid-first design (ages 7–12):
 *   - Big colorful planet cards, a friendly astronaut mascot, star chips.
 *   - Every control is a large button; locked cards answer when tapped.
 *   - Progress is shown as stars and level dots — no percentages, no
 *     dashboard tables, nothing that feels like school.
 *
 * This module is purely presentational: it reads LEVELS + Progression and
 * links to the existing game screens. It never touches game state.
 *
 * Safe no-ops: if LEVELS or Progression fail to load, the hub shows an
 * error-free empty state and the rest of the game is unaffected.
 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  let grid = null;
  let speechEl = null;
  let built = false;

  const GREETINGS = [
    "Hi, Commander! Pick a mission card and let's explore space!",
    "Every mission teaches one real space secret. Ready?",
    "Collect ⭐ stars to become a Master Commander!",
  ];

  /* ---------- helpers ---------- */

  function say(text) {
    if (speechEl) speechEl.textContent = text;
  }

  function starRow(stars, max = 3) {
    let html = "";
    for (let i = 0; i < max; i += 1) {
      html += `<span class="academy-star${i < stars ? " academy-star--earned" : ""}" aria-hidden="true">⭐</span>`;
    }
    return html;
  }

  /** Small dot strip: one dot per level, filled when completed. */
  function levelDots(section) {
    return section.levels
      .map((level) => {
        const stars = window.Progression ? Progression.getStars(level.id) : 0;
        const done = stars >= 1;
        const soon = level.status !== "ready";
        return `<span class="academy-dot${done ? " academy-dot--done" : ""}${soon ? " academy-dot--soon" : ""}" title="${level.title}"></span>`;
      })
      .join("");
  }

  /* ---------- card builders ---------- */

  function sectionCard(section) {
    const prog = window.Progression;
    const unlocked = prog ? prog.isSectionUnlocked(section) : false;

    const stars = prog ? prog.starsInSection(section.id) : 0;
    const maxStars = prog ? prog.maxStarsInSection(section.id) : section.levels.length * 3;
    const doneLevels = prog ? prog.completedLevelsInSection(section.id) : 0;

    const card = document.createElement("button");
    card.type = "button";
    card.className = `academy-card ${section.theme}${unlocked ? "" : " academy-card--locked"}`;
    card.setAttribute("aria-label", unlocked
      ? `${section.name}: ${doneLevels} of ${section.levels.length} missions done, ${stars} of ${maxStars} stars`
      : `${section.name} is locked`);

    card.innerHTML = `
      <span class="academy-card__planet" aria-hidden="true"></span>
      <span class="academy-card__icon" aria-hidden="true">${unlocked ? section.icon : "🔒"}</span>
      <span class="academy-card__name">${section.name}</span>
      <span class="academy-card__tagline">${section.tagline}</span>
      <span class="academy-card__levels">${levelDots(section)}</span>
      <span class="academy-card__stars">${starRow(0)}<span class="academy-card__starcount">⭐ ${stars} / ${maxStars}</span></span>
      <span class="academy-card__action">${unlocked ? "Play ▸" : "Locked 🔒"}</span>`;

    card.addEventListener("click", () => {
      window.Sound?.play("click");
      if (!unlocked) {
        const need = LEVELS.getSection(section.unlockAfter);
        say(`${section.name} is locked. Finish ${need ? need.name : "the last section"} first!`);
        card.classList.remove("academy-card--wobble");
        void card.offsetWidth;
        card.classList.add("academy-card--wobble");
        return;
      }
      if (section.id === "master") return; // handled by its mission buttons
      // Phase B: unlocked level sections open the section screen (level list).
      renderSection(section.id);
      window.App?.showScreen("screen-section");
    });

    return card;
  }

  /** Master Commander card: the original game, presented for kids. */
  function masterCard(section) {
    const prog = window.Progression;
    const stats = window.Storage ? Storage.loadStats() : { bestScore: 0 };

    const card = document.createElement("div");
    card.className = `academy-card ${section.theme} academy-card--master`;
    card.innerHTML = `
      <span class="academy-card__planet" aria-hidden="true"></span>
      <span class="academy-card__icon" aria-hidden="true">${section.icon}</span>
      <span class="academy-card__name">${section.name}</span>
      <span class="academy-card__tagline">${section.tagline}</span>
      <span class="academy-master-missions">
        ${section.levels.map((level) => {
          const stars = prog ? prog.getStars(level.id) : 0;
          const best = prog ? prog.bestScore(level.id) : 0;
          return `
          <button class="academy-mission-btn" type="button" data-mission="${level.ref}">
            <span class="academy-mission-btn__icon" aria-hidden="true">${level.icon}</span>
            <span class="academy-mission-btn__text">
              <span class="academy-mission-btn__title">${level.title}</span>
              <span class="academy-mission-btn__meta">7 days · ${level.concept}</span>
              <span class="academy-mission-btn__stars">${starRow(stars)}<span>best ${best}</span></span>
            </span>
          </button>`;
        }).join("")}
      </span>
      <span class="academy-master-record">🎖️ Lifetime best score: <strong>${stats.bestScore || 0}</strong></span>`;

    card.querySelectorAll("[data-mission]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.Sound?.play("click");
        say("Good luck, Commander! 🚀");
        // Straight into the existing, untouched briefing → mission flow.
        window.App?.openBriefing(btn.dataset.mission);
      });
    });

    return card;
  }

  /* ---------- section screen (Phase B: level list for one section) ---------- */

  let currentSection = null;

  /**
   * A level card is unlocked when it is the first not-yet-completed level
   * of its section (sequential unlock): level 1 always, level N+1 once
   * level N has at least 1 star.
   */
  function levelUnlocked(section, index) {
    if (index === 0) return true;
    const prev = section.levels[index - 1];
    return window.Progression ? Progression.getStars(prev.id) >= 1 : false;
  }

  function levelCard(section, level, index) {
    const prog = window.Progression;
    const stars = prog ? prog.getStars(level.id) : 0;
    const ready = level.status === "ready";
    const unlocked = ready && levelUnlocked(section, index);
    const replay = stars > 0 && unlocked;

    const card = document.createElement("button");
    card.type = "button";
    card.disabled = !unlocked;
    card.className = `section-card${unlocked ? "" : " section-card--locked"}${replay ? " section-card--replay" : ""}`;
    card.setAttribute("aria-label", unlocked
      ? `${level.title}${stars ? `, ${stars} of 3 stars` : ""}. Play`
      : `${level.title} is locked`);

    card.innerHTML = `
      <span class="section-card__icon" aria-hidden="true">${unlocked ? level.icon : "🔒"}</span>
      <span class="section-card__title">${level.title}</span>
      <span class="section-card__concept">${level.concept}</span>
      <span class="section-card__stars">${starRow(stars)}</span>
      <span class="section-card__badge">${
        !ready ? "Soon ⏳" : unlocked ? (replay ? `⭐ ${stars}/3 · Replay 🔁` : "Play ▶") : "Locked 🔒"
      }</span>`;

    card.addEventListener("click", () => {
      window.Sound?.play("click");
      if (!unlocked) {
        say(`Finish "${section.levels[index - 1].title}" first to unlock this mission!`);
        card.classList.remove("section-card--locked", "academy-card--wobble");
        void card.offsetWidth;
        card.classList.add("academy-card--wobble");
        return;
      }
      say("Good luck, Commander! 🚀");
      window.LevelRuntime?.open(level.id);
    });

    return card;
  }

  function renderSection(sectionId) {
    const section = LEVELS.getSection(sectionId);
    if (!section) return;
    currentSection = sectionId;

    const prog = window.Progression;
    const stars = prog ? prog.starsInSection(sectionId) : 0;
    const maxStars = prog ? prog.maxStarsInSection(sectionId) : section.levels.length * 3;
    const doneLevels = prog ? prog.completedLevelsInSection(sectionId) : 0;

    const title = $("section-title");
    const sub = $("section-sub");
    if (title) title.textContent = `${section.icon} ${section.name}`;
    if (sub) {
      sub.textContent = prog
        ? `${doneLevels} of ${section.levels.length} missions done · ⭐ ${stars} / ${maxStars}`
        : section.tagline;
    }

    const grid = $("section-levels");
    if (!grid) return;
    grid.innerHTML = "";
    section.levels.forEach((level, i) => grid.appendChild(levelCard(section, level, i)));
    window.Ani?.staggerIn(grid, ".section-card");
  }

  /** onEnter hook for the section screen (re-renders with fresh stars). */
  function refreshSection() {
    if (currentSection) renderSection(currentSection);
  }

  /* ---------- render ---------- */

  function renderHeader() {
    const sum = window.Progression ? Progression.summary() : { stars: 0, maxStars: 0, badges: 0 };
    const starsEl = $("academy-stars");
    const badgesEl = $("academy-badges");
    if (starsEl) starsEl.textContent = `⭐ ${sum.stars} / ${sum.maxStars}`;
    if (badgesEl) badgesEl.textContent = `🏅 ${sum.badges}`;
  }

  function refresh() {
    renderHeader();
    build();
  }

  function build() {
    if (!grid || typeof LEVELS === "undefined") return;
    grid.innerHTML = "";

    for (const section of LEVELS.allSections()) {
      grid.appendChild(section.id === "master" ? masterCard(section) : sectionCard(section));
    }

    window.Ani?.staggerIn(grid, ".academy-card");
    built = true;
  }

  /* ---------- wiring ---------- */

  function init() {
    grid = $("academy-grid");
    speechEl = $("academy-speech");
    if (!grid) return;

    // Greeting rotates gently between visits.
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    say(greeting);

    // Cold load: the Academy is the default screen, so onEnter never fires —
    // render the star/badge chips here too.
    renderHeader();
    build();
  }

  document.addEventListener("DOMContentLoaded", init);

  window.Academy = { refresh, build, renderSection, refreshSection, get isBuilt() { return built; } };
})();
