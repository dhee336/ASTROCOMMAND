/**
 * app.js — ASTRO COMMAND UI layer (Modules 1–9).
 * Owns screen routing, dashboard rendering, the event modal and results.
 * Game rules live in game-engine.js; UI never changes resource values directly.
 */
const App = (() => {
  "use strict";

  let state = null;      // current game state (from GameEngine)
  let resourceChart = null;

  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------ */
  /* Screen routing                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Screen registry (Phase A): screens may register onEnter/onExit hooks.
   * Keeps showScreen() generic so the Academy and future phase screens
   * plug in without more routing code.
   */
  const SCREENS = {};

  function registerScreen(id, hooks) {
    SCREENS[id] = hooks || {};
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.toggle("screen--active", s.id === id);
    });
    // Reflect the current screen in the top navigation
    document.querySelectorAll(".nav-link[data-nav]").forEach((el) => {
      el.classList.toggle("nav-link--active", el.dataset.nav === id);
    });
    window.Ani?.screen(document.getElementById(id));
    window.scrollTo({ top: 0, behavior: "smooth" });
    const hooks = SCREENS[id];
    if (hooks && typeof hooks.onEnter === "function") hooks.onEnter(document.getElementById(id));
  }

  /** All elements with data-nav or data-mission act as simple routers. */
  function bindNavigation() {
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => showScreen(el.dataset.nav));
    });
    $("nav-home").addEventListener("click", () => showScreen("screen-academy"));
    $("nav-reset").addEventListener("click", confirmFullReset);
    $("btn-start").addEventListener("click", () => showScreen("screen-select"));
    $("btn-howto").addEventListener("click", () =>
      $("how-to-play").scrollIntoView({ behavior: "smooth" })
    );
  }

  function confirmFullReset() {
    if (!window.confirm("Reset all saved progress and missions?")) return;
    Storage.clearAll();
    // Also wipe Academy progress (Phase A). Progression is a separate
    // storage key, not part of protected storage.js.
    window.Progression?.resetAll();
    state = null;
    $("resume-banner").classList.add("hidden");
    showScreen("screen-academy");
    toast("All progress has been reset.", "warn");
  }

  /* ------------------------------------------------------------------ */
  /* Module 2 — mission selection                                        */
  /* ------------------------------------------------------------------ */

  function renderMissionCards() {
    const container = $("mission-cards");
    container.innerHTML = Object.values(MISSIONS).map((m) => `
      <button class="mission-card" data-mission="${m.key}" type="button">
        <span class="mission-card__icon">${m.icon}</span>
        <span class="mission-card__name">${m.name}</span>
        <span class="mission-card__meta">
          <span class="chip ${m.difficultyClass}">${m.difficulty}</span>
          <span class="chip">${m.durationDays} days</span>
          <span class="chip">👨‍🚀 ${m.crewSize} crew</span>
        </span>
        <span class="mission-card__desc">${m.description}</span>
        <span class="mission-card__chips">
          ${m.challenges.map((c) => `<span class="chip">${c}</span>`).join("")}
        </span>
        <span class="btn btn--primary mission-card__start">Select Mission →</span>
      </button>
    `).join("");

    container.querySelectorAll("[data-mission]").forEach((card) => {
      card.addEventListener("click", () => openBriefing(card.dataset.mission));
    });

    window.Ani?.staggerIn(container);
  }

  /* ------------------------------------------------------------------ */
  /* Module 3 — mission briefing                                         */
  /* ------------------------------------------------------------------ */

  let selectedMission = null;

  function openBriefing(missionKey) {
    const mission = getMission(missionKey);
    if (!mission) return;
    selectedMission = missionKey;

    $("briefing-title").textContent = `${mission.icon} ${mission.name} — Briefing`;
    $("briefing-sub").textContent =
      "Simplified educational mission parameters — not real NASA values.";

    $("briefing-objective").textContent = mission.objective;
    $("briefing-crew").innerHTML = `
      <li><strong>Crew:</strong> ${mission.crewSize} astronauts</li>
      <li><strong>Duration:</strong> ${mission.durationDays} mission days</li>
      <li><strong>Actions:</strong> 3 action points per day</li>`;
    $("briefing-challenges").innerHTML = mission.challenges
      .map((c) => `<li>${c}</li>`).join("");
    $("briefing-resources").innerHTML = Resources.GAUGES.map((g) => {
      const value = mission.start[g.id];
      const text = g.id === "radiation"
        ? `${value} exposure (low is good)`
        : `${value} / 100`;
      return `<li><span>${g.icon} ${g.label}</span><span class="val">${text}</span></li>`;
    }).join("");

    showScreen("screen-briefing");
  }

  function startSelectedMission() {
    if (!selectedMission) return;
    startMission(selectedMission);
  }

  /* ------------------------------------------------------------------ */
  /* Module 4 — mission control dashboard                                */
  /* ------------------------------------------------------------------ */

  function startMission(missionKey) {
    state = GameEngine.createState(missionKey);
    persist();
    showScreen("screen-dashboard");
    initChart();
    renderDashboard();
    toast(`${state.missionName} is underway. Good luck, Commander.`, "good");
  }

  function persist() {
    if (state && state.status === "active") Storage.saveMission(state);
  }

  const STATUS_TEXT = { good: "Nominal", warn: "Strained", critical: "Critical" };

  function renderDashboard() {
    if (!state) return;
    const mission = getMission(state.missionKey);

    $("dash-mission-name").textContent = `${mission.icon} ${mission.name}`;
    $("dash-day-label").textContent = `Day ${state.day} / ${state.maxDays}`;
    $("dash-ap-label").textContent = `⚡ ${state.ap} AP`;
    $("dash-ap-hint").textContent = state.ap > 0
      ? `You have ${state.ap} action point${state.ap > 1 ? "s" : ""} left today. Costs and benefits are shown on each card.`
      : "No action points left — press Advance Day to continue the mission.";

    const overall = Resources.overallStatus(state);
    const statusChip = $("dash-status-label");
    statusChip.textContent = STATUS_TEXT[overall];
    statusChip.className = `dash-chip dash-chip--${overall === "good" ? "ok" : overall}`;

    // Feed plain visual flags to the decorative exterior-view panel
    // (read-only snapshot; the panel never touches game state).
    window.ExtView?.sync({
      missionKey: state.missionKey,
      missionName: mission.name,
      day: state.day,
      radiation: Resources.statusOf("radiation", state.radiation),
      habitat: Resources.statusOf("habitat", state.habitat),
      power: Resources.statusOf("power", state.resources.power),
    });

    const progress = ((state.day - 1) / state.maxDays) * 100;
    $("dash-progress-bar").style.width = `${progress}%`;

    renderStatCards();
    renderActionCards();
    renderLog();
    updateChart();
  }

  /** Short human label for a gauge's status tier. */
  function statusLabel(gauge, status, isPool) {
    if (status === "good") return "NOMINAL";
    if (status === "critical") {
      if (gauge.id === "radiation") return "SEVERE";
      return isPool ? "CRITICAL" : "FAILING";
    }
    if (gauge.id === "radiation") return "ELEVATED";
    return isPool ? "LOW" : "STRAINED";
  }

  /** Build the 8 ring-gauge cards (life support + systems & crew). */
  function renderStatCards() {
    const groups = { life: $("life-support-stats"), systems: $("systems-stats") };
    groups.life.innerHTML = "";
    groups.systems.innerHTML = "";

    for (const gauge of Resources.GAUGES) {
      const value = gauge.id in state.resources
        ? state.resources[gauge.id]
        : state[gauge.id];
      const status = Resources.statusOf(gauge.id, value);
      const isPool = gauge.id in state.resources;
      const clamped = Resources.clamp(value);

      const card = document.createElement("div");
      card.className = `stat-card stat-card--${status}`;
      card.innerHTML = `
        <div class="stat-card__gauge">
          <div class="stat-card__ring" style="--p:${clamped}" role="img" aria-label="${gauge.label}: ${Math.round(clamped)} percent"></div>
          <span class="stat-card__value" data-status="${status}">${Math.round(value)}<i class="stat-card__unit">%</i></span>
        </div>
        <span class="stat-card__name">${gauge.icon} ${gauge.label}</span>
        <span class="stat-card__state">${statusLabel(gauge, status, isPool)}</span>`;
      groups[gauge.group].appendChild(card);
      // Animate ring + readout only when this gauge's value changed.
      window.Ani?.gauge(card, gauge.id, clamped, Math.round(value));
    }
  }

  /** Build the command action cards, disabling unaffordable ones. */
  function renderActionCards() {
    const grid = $("action-grid");
    grid.innerHTML = "";

    for (const action of Resources.ACTIONS) {
      const affordable = GameEngine.canAfford(state, action.deltas);
      const enoughAp = state.ap >= action.ap;
      const disabled = !affordable || !enoughAp || state.status !== "active";

      const card = document.createElement("button");
      card.className = "action-card";
      card.type = "button";
      card.disabled = disabled;
      card.title = action.note;
      card.innerHTML = `
        <span class="action-card__top">
          <span class="action-card__name">${action.icon} ${action.name}</span>
          <span class="action-card__ap">${action.ap} AP</span>
        </span>
        <span class="action-card__desc">${action.desc}</span>
        <span class="action-card__cost">${action.cost}</span>
        <span class="action-card__benefit">${action.benefit}</span>`;
      card.addEventListener("click", () => {
        const result = GameEngine.performAction(state, action.id);
        if (!result.ok) {
          toast(result.message, "bad");
          return;
        }
        window.Sound?.play("action");
        persist();
        renderDashboard();
        toast(result.message, "good");
      });
      grid.appendChild(card);
    }
  }

  function renderLog() {
    const log = $("mission-log");
    log.innerHTML = [...state.log].reverse()
      .map((entry) => `<li class="log--${entry.type}"><strong>Day ${entry.day}</strong> — ${entry.text}</li>`)
      .join("");
  }

  /* ------------------------------------------------------------------ */
  /* Chart.js resource history                                           */
  /* ------------------------------------------------------------------ */

  function initChart() {
    if (!window.Chart) return; // offline: bars still show the values
    if (resourceChart) {
      resourceChart.destroy();
      resourceChart = null;
    }
    const ctx = $("resource-chart").getContext("2d");
    resourceChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          { label: "Oxygen", data: [], borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,.12)", tension: 0.4, pointRadius: 0, borderWidth: 2, pointHoverRadius: 4 },
          { label: "Water", data: [], borderColor: "#a78bfa", backgroundColor: "rgba(167,139,250,.12)", tension: 0.4, pointRadius: 0, borderWidth: 2, pointHoverRadius: 4 },
          { label: "Food", data: [], borderColor: "#34d399", backgroundColor: "rgba(52,211,153,.12)", tension: 0.4, pointRadius: 0, borderWidth: 2, pointHoverRadius: 4 },
          { label: "Power", data: [], borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,.12)", tension: 0.4, pointRadius: 0, borderWidth: 2, pointHoverRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: {
              color: "#aab4d8",
              usePointStyle: true,
              pointStyleWidth: 8,
              boxHeight: 8,
              font: { family: "Inter, sans-serif", size: 10 },
            },
          },
          tooltip: {
            backgroundColor: "rgba(10, 15, 34, 0.95)",
            borderColor: "rgba(124, 148, 255, 0.3)",
            borderWidth: 1,
            titleColor: "#22d3ee",
            bodyColor: "#eaefff",
            titleFont: { family: "Space Grotesk, sans-serif", weight: "600" },
            bodyFont: { family: "Inter, sans-serif", size: 11 },
            padding: 10,
            displayColors: true,
          },
        },
        scales: {
          x: {
            ticks: { color: "#6b7699", font: { family: "Inter, sans-serif", size: 10 } },
            grid: { color: "rgba(124, 148, 255, 0.07)" },
          },
          y: {
            min: 0,
            max: 100,
            ticks: { color: "#6b7699", font: { family: "Inter, sans-serif", size: 10 }, stepSize: 25 },
            grid: { color: "rgba(124, 148, 255, 0.07)" },
            border: { display: false },
          },
        },
      },
    });
  }

  function updateChart() {
    if (!resourceChart) return;
    resourceChart.data.labels = state.history.map((h) => `Day ${h.day}`);
    resourceChart.data.datasets[0].data = state.history.map((h) => h.oxygen);
    resourceChart.data.datasets[1].data = state.history.map((h) => h.water);
    resourceChart.data.datasets[2].data = state.history.map((h) => h.food);
    resourceChart.data.datasets[3].data = state.history.map((h) => h.power);
    resourceChart.update();
  }

  /* ------------------------------------------------------------------ */
  /* Module 6 — emergency event modal                                    */
  /* ------------------------------------------------------------------ */

  let activeEvent = null;

  function showEventModal(event) {
    activeEvent = event;
    $("event-day").textContent = state.day;
    $("event-title").textContent = `${event.icon} ${event.title}`;
    $("event-description").textContent = event.description;

    $("event-choices").innerHTML = "";
    $("event-choices").classList.remove("hidden");
    $("event-outcome").classList.add("hidden");

    event.choices.forEach((choice, index) => {
      const btn = document.createElement("button");
      btn.className = "event-choice";
      btn.type = "button";
      btn.innerHTML = `
        <span class="event-choice__label">${index + 1}. ${choice.label}</span>
        <span class="event-choice__consequence">Consequence: ${choice.consequence}</span>`;
      btn.addEventListener("click", () => chooseEventOption(index));
      $("event-choices").appendChild(btn);
    });

    $("event-modal").classList.remove("hidden");
    window.Ani?.modalIn($("event-modal"));
    window.Ani?.alertPulse($("dash-status-label"));
    window.ExtView?.alert(event.id);
    window.Sound?.play("alert");
  }

  function chooseEventOption(index) {
    const result = GameEngine.resolveEvent(state, activeEvent, index);
    persist();

    // Hide the choice list and reveal the outcome panel.
    $("event-choices").classList.add("hidden");
    $("event-outcome").classList.remove("hidden");
    $("event-outcome-title").textContent = "Decision logged";
    $("event-outcome-text").textContent = result.outcome;
    $("event-outcome-edu").textContent = `🎓 ${activeEvent.choices[index].edu}`;
  }

  function continueAfterEvent() {
    const finish = () => {
      $("event-modal").classList.add("hidden");
      if (state.status !== "active") {
        showResults();
      } else {
        renderDashboard();
      }
    };
    // Animated exit when GSAP is available; instant otherwise.
    if (!window.Ani?.modalOut($("event-modal"), finish)) finish();
  }

  /* ------------------------------------------------------------------ */
  /* Day progression (End Day button)                                    */
  /* ------------------------------------------------------------------ */

  function advanceDay() {
    if (!state || state.status !== "active") return;
    window.Sound?.play("day");

    const result = GameEngine.endDay(state);
    persist();

    if (result.event) {
      renderDashboard();
      showEventModal(result.event);
      return;
    }
    if (state.status !== "active") {
      renderDashboard();
      showResults();
      return;
    }
    renderDashboard();
  }

  /* ------------------------------------------------------------------ */
  /* Module 8 — results screen                                           */
  /* ------------------------------------------------------------------ */

  function showResults() {
    const results = GameEngine.buildResults(state);
    Storage.clearMission(); // finished missions are no longer resumable

    // Phase A: Master Commander missions feed the Academy progression.
    // Presentation only — reads the existing score, changes no gameplay value.
    const masterLevelId = window.LEVELS ? LEVELS.missionLevelId(state.missionKey) : null;
    if (masterLevelId && window.Progression) {
      Progression.recordLevel(
        masterLevelId,
        Progression.starsForScore(masterLevelId, results.score),
        results.score
      );
    }

    const screen = $("screen-results");
    screen.classList.toggle("screen--success", results.success);
    screen.classList.toggle("screen--fail", !results.success);

    $("results-title").textContent = results.success
      ? "🏆 Mission Success!"
      : "💥 Mission Failed";
    $("results-reason").textContent = state.endReason || "";

    $("results-rating").textContent = results.rating.title;

    // Guarantee correctness even if animation tickers are stalled
    // (background/occluded tab): show the true value immediately, then let
    // the count-up animation take over visually when frames are running.
    $("results-score").textContent = results.score;
    if (!window.Ani?.score($("results-score"), results.score)) {
      animateScore(results.score);
    }
    // CSS transition (width 0.8s) animates the bar without needing rAF.
    $("results-score-bar").style.width = `${results.score / 10}%`;

    $("results-stats").innerHTML = Resources.GAUGES.map((g) => {
      const value = g.id in state.resources ? state.resources[g.id] : state[g.id];
      const text = g.id === "radiation"
        ? `${Math.round(value)} exposure`
        : `${Math.round(value)} / 100`;
      return `<li><span>${g.icon} ${g.label}</span><span class="val">${text}</span></li>`;
    }).join("") + `
      <li><span>📆 Days survived</span><span class="val">${results.record.daysSurvived} / ${results.record.maxDays}</span></li>
      <li><span>🚨 Emergencies handled</span><span class="val">${results.record.eventsHandled}</span></li>
      <li><span>🧭 Decisions made</span><span class="val">${results.record.decisions}</span></li>`;

    $("results-record").innerHTML = results.record.decisionsLog.length
      ? results.record.decisionsLog
          .map((d) => `<li><strong>Day ${d.day} · ${d.event}</strong> — chose "${d.choice}"</li>`)
          .join("")
      : "<li>No emergency decisions were recorded this mission.</li>";

    $("results-feedback").innerHTML = results.feedback
      .map((line) => `<li>${line}</li>`).join("");

    showScreen("screen-results");
    window.Ani?.resultsIn($("screen-results"));
    window.Sound?.play(results.success ? "success" : "fail");
  }

  /** Ease-out cubic count-up animation for the final mission score. */
  function animateScore(target) {
    const el = $("results-score");
    const duration = 1200;
    let start = null;
    function frame(now) {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    // Safety net: if rAF is stalled (hidden/occluded tab), keep the true
    // final score on screen instead of a stuck "0".
    setTimeout(() => {
      if (start === null) el.textContent = target;
    }, 700);
  }

  /* ------------------------------------------------------------------ */
  /* Resume banner & reset                                               */
  /* ------------------------------------------------------------------ */

  function checkForSavedMission() {
    const saved = Storage.loadMission();
    if (!saved) return;

    state = saved;
    $("resume-mission-name").textContent = saved.missionName;
    $("resume-day").textContent = saved.day;
    $("resume-banner").classList.remove("hidden");

    $("btn-resume").addEventListener("click", () => {
      $("resume-banner").classList.add("hidden");
      showScreen("screen-dashboard");
      initChart();
      renderDashboard();
      toast(`Welcome back, Commander. Day ${state.day} of your ${state.missionName}.`, "good");
    });
    $("btn-discard").addEventListener("click", () => {
      Storage.clearMission();
      state = null;
      $("resume-banner").classList.add("hidden");
      toast("Saved mission discarded.", "warn");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */

  let toastTimer = null;
  function toast(message, type = "info") {
    const el = $("toast");
    el.textContent = message;
    el.className = `toast toast--${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 3400);
  }

  /* ------------------------------------------------------------------ */
  /* Decorative star field (shared with landing design)                  */
  /* ------------------------------------------------------------------ */

  function buildStarField(count = 120) {
    const field = $("star-field");
    if (!field) return;
    for (let i = 0; i < count; i += 1) {
      const star = document.createElement("span");
      const size = Math.random() * 2.2 + 0.8;
      star.className = "star";
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.setProperty("--twinkle-duration", `${Math.random() * 3 + 2}s`);
      field.appendChild(star);
    }
    // A couple of periodic shooting stars (pure CSS animation, purely decorative).
    for (let i = 0; i < 3; i += 1) {
      const meteor = document.createElement("span");
      meteor.className = "shooting-star";
      meteor.style.setProperty("--y", `${Math.random() * 40 + 4}%`);
      meteor.style.setProperty("--dur", `${Math.random() * 6 + 8}s`);
      meteor.style.setProperty("--delay", `${Math.random() * 12 + 2}s`);
      field.appendChild(meteor);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    bindNavigation();
    renderMissionCards();

    $("btn-begin").addEventListener("click", startSelectedMission);
    $("btn-end-day").addEventListener("click", advanceDay);
    $("btn-event-continue").addEventListener("click", continueAfterEvent);
    $("btn-restart").addEventListener("click", () => startMission(state.missionKey));
    $("btn-home").addEventListener("click", () => showScreen("screen-academy"));

    // Academy hub refreshes its stars/progress every time it is shown.
    registerScreen("screen-academy", {
      onEnter: () => window.Academy?.refresh(),
    });

    checkForSavedMission();
    buildStarField();
    window.Ani?.init();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { showScreen, startMission, advanceDay, openBriefing };
})();

// Expose for console debugging and automated testing.
window.App = App;
