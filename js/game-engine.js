/**
 * game-engine.js — ASTROCOMMAND simulation core (Module 7).
 *
 * Day-by-day progression:
 *   1. Player spends action points on command actions (see resources.js).
 *   2. endDay() applies consumption, recharge, wear, shortage penalties.
 *   3. An emergency event may fire; the player's decision applies instantly.
 *   4. Failure is checked on hard thresholds — never on a small dip.
 *   5. After maxDays, the mission is scored and rated.
 *
 * All numbers are simplified educational game settings.
 */
const GameEngine = (() => {
  "use strict";

  const { clamp, applyDeltas } = Resources;

  /* ------------------------------------------------------------------ */
  /* State creation                                                      */
  /* ------------------------------------------------------------------ */

  /** Build a fresh game state for a mission key ('lunar' | 'martian'). */
  function createState(missionKey) {
    const mission = getMission(missionKey);
    if (!mission) throw new Error(`Unknown mission: ${missionKey}`);

    const s = mission.start;
    return {
      missionKey,
      missionName: mission.name,
      day: 1,
      maxDays: mission.durationDays,
      maxAp: 3,
      ap: 3,
      apPenaltyNextDay: 0,

      // Managed life-support pools live in `resources`;
      // radiation, shielding, habitat and health live on state directly
      // (they are tracked by the engine, not treated as spendable pools).
      resources: {
        oxygen: s.oxygen,
        water: s.water,
        food: s.food,
        power: s.power,
      },
      radiation: s.radiation,
      shielding: s.shielding,
      habitat: s.habitat,
      health: s.health,

      history: [],                          // end-of-day snapshots for Chart.js
      log: [],                              // mission log entries
      decisions: [],                        // record of every event choice
      usedActionsToday: [],
      eventsHandled: 0,
      bonusScore: 0,

      status: "active",                     // active | success | failed
      endReason: null,
    };
  }

  function addLog(state, text, type = "info") {
    state.log.push({ day: state.day, text, type });
    if (state.log.length > 40) state.log.shift();
  }

  /* ------------------------------------------------------------------ */
  /* Command actions (Module 5)                                          */
  /* ------------------------------------------------------------------ */

  /**
   * An action is affordable only if no negative delta would push a
   * resource below zero — the player must pay before gaining.
   */
  function canAfford(state, deltas) {
    for (const [key, delta] of Object.entries(deltas)) {
      const current = key in state.resources ? state.resources[key] : state[key];
      if (delta < 0 && current + delta < 0) return false;
    }
    return true;
  }

  /**
   * Perform a command action.
   * @returns {{ok: boolean, message: string}}
   */
  function performAction(state, actionId) {
    if (state.status !== "active") {
      return { ok: false, message: "Mission is over." };
    }
    const action = Resources.ACTIONS.find((a) => a.id === actionId);
    if (!action) return { ok: false, message: "Unknown action." };

    if (state.ap < action.ap) {
      return { ok: false, message: "Not enough action points today. Advance the day to recover." };
    }
    if (!canAfford(state, action.deltas)) {
      return { ok: false, message: `Not enough resources for ${action.name}.` };
    }

    state.ap -= action.ap;
    applyDeltas(state, action.deltas);
    state.usedActionsToday.push(actionId);
    addLog(state, `${action.icon} ${action.name} executed (${action.benefit}).`, "good");

    return { ok: true, message: `${action.name}: ${action.benefit}. ${action.note}` };
  }

  /* ------------------------------------------------------------------ */
  /* Day progression                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Advance one day: consumption → recharge → wear → penalties → regen.
   * @returns {{ended: boolean, event: object|null}}
   */
  function endDay(state) {
    if (state.status !== "active") return { ended: true, event: null };
    const mission = getMission(state.missionKey);

    // 1) Base consumption of life-support pools.
    applyDeltas(state, mission.dailyConsumption);

    // 2) Simplified trickle recharge (solar panels / passive recovery).
    applyDeltas(state, mission.dailyRecharge);

    // 3) Environmental wear: radiation accumulates, shielding and
    //    habitat degrade slowly every day.
    applyDeltas(state, mission.dailyWear);

    // 4) Shortage penalties. IMPORTANT: a single resource dipping low
    //    only triggers a WARNING — the crew only bleeds health when a
    //    resource actually runs at ZERO, and only while it stays there.
    const r = state.resources;
    let penalty = 0;
    const penaltyNotes = [];

    if (r.oxygen <= 0) { penalty += 35; penaltyNotes.push("no oxygen (life support collapsed)"); }
    if (r.water <= 0)  { penalty += 20; penaltyNotes.push("no water (severe dehydration)"); }
    if (r.food <= 0)   { penalty += 15; penaltyNotes.push("no food (starvation)"); }
    if (r.power <= 0)  { applyDeltas(state, { habitat: -15 }); penaltyNotes.push("power outage (habitat systems offline)"); }
    if (state.radiation >= 85) { penalty += 15; penaltyNotes.push("dangerous radiation sickness"); }

    if (penalty > 0) {
      applyDeltas(state, { health: -penalty });
      addLog(state, `⚠️ End of day: the crew suffered without ${penaltyNotes.join(", ")}. Health −${penalty}.`, "bad");
    } else if (r.oxygen > 30 && r.water > 30 && r.food > 30 && state.radiation < 60) {
      // Recovery: a well-supplied crew slowly regains health.
      applyDeltas(state, { health: 3 });
      addLog(state, "✅ All systems nominal. The crew rests and recovers (+3 health).", "good");
    } else {
      addLog(state, "Resources are stretched thin — keep them topped up.", "info");
    }

    // 5) Record the end-of-day snapshot for the resource chart.
    state.history.push({
      day: state.day,
      oxygen: r.oxygen,
      water: r.water,
      food: r.food,
      power: r.power,
      health: state.health,
      radiation: state.radiation,
    });

    // 6) Check hard failure thresholds BEFORE anything else can happen.
    checkMissionEnd(state);
    if (state.status !== "active") return { ended: true, event: null };

    // 7) Mission survived the day → move to the next one.
    state.day += 1;
    state.ap = Math.max(0, state.maxAp - state.apPenaltyNextDay);
    state.apPenaltyNextDay = 0;
    state.usedActionsToday = [];

    if (state.day > state.maxDays) {
      state.status = "success";
      state.endReason = `Mission complete! The crew survived all ${state.maxDays} days at ${state.missionName}.`;
      addLog(state, "🏁 Mission duration complete. The outpost stands.", "good");
      return { ended: true, event: null };
    }

    addLog(state, `☀️ Day ${state.day} begins. Action points restored.`, "info");

    // 8) Emergency events (Module 6).
    const event = Events.rollEvent(state.missionKey);
    return { ended: false, event };
  }

  /**
   * Apply the chosen event decision.
   * @returns {{outcome: string, ended: boolean}}
   */
  function resolveEvent(state, event, choiceIndex) {
    const choice = event.choices[choiceIndex];
    if (!choice) return { outcome: "Invalid choice.", ended: state.status !== "active" };

    const outcome = choice.apply(state);
    state.eventsHandled += 1;
    state.decisions.push({
      day: state.day,
      event: event.title,
      choice: choice.label,
    });
    addLog(state, `${event.icon} Day ${state.day} — ${event.title}: "${choice.label}".`, "event");

    // A bad decision during an event can push radiation to the limit.
    checkMissionEnd(state);
    return { outcome, ended: state.status !== "active" };
  }

  /* ------------------------------------------------------------------ */
  /* Failure & success conditions                                        */
  /* ------------------------------------------------------------------ */

  /** Hard failure thresholds — small dips never end the mission. */
  function checkMissionEnd(state) {
    if (state.status !== "active") return;

    if (state.health <= 0) {
      state.status = "failed";
      state.endReason = "The crew's health reached zero. Mission Control has ordered an emergency evacuation.";
    } else if (state.habitat <= 0) {
      state.status = "failed";
      state.endReason = "The habitat structure failed beyond repair. The outpost is no longer safe to occupy.";
    } else if (state.radiation >= 100) {
      state.status = "failed";
      state.endReason = "Cumulative radiation exposure reached the maximum safe limit. The crew has been evacuated.";
    }
  }

  /* ------------------------------------------------------------------ */
  /* Scoring & educational feedback (Module 8)                           */
  /* ------------------------------------------------------------------ */

  /**
   * Final score out of 1000.
   * Weighting: crew health matters most, then average resource reserves,
   * habitat integrity, shielding, and how well emergencies were handled.
   */
  function computeScore(state) {
    const r = state.resources;
    const avgResources = (r.oxygen + r.water + r.food + r.power) / 4;
    const raw =
      state.health * 4 +            // max 400 — the crew comes first
      avgResources * 2.5 +          // max 250 — supplies for the future
      state.habitat * 1.5 +         // max 150 — a sound home
      state.shielding * 1 +         // max 100 — protection from radiation
      -state.radiation * 0.5 +      // penalty for exposure
      state.eventsHandled * 20 +    // reward for facing emergencies
      state.bonusScore;
    return clamp(Math.round(raw), 0, 1000);
  }

  function ratingFor(score) {
    if (score >= 750) return { title: "🏆 Outstanding Commander", note: "You balanced every system like a veteran flight director." };
    if (score >= 550) return { title: "🥈 Mission Ready", note: "Solid command. A few trade-offs went the wrong way, but the crew is safe." };
    if (score >= 350) return { title: "🥉 Developing Astronaut", note: "The outpost survived, but several systems ran dangerously low." };
    return { title: "🎓 Cadet in Training", note: "The mission completed, but life support was neglected. Study the Learn section and try again!" };
  }

  /**
   * Educational debrief lines generated from how the player actually played.
   * @returns {string[]} list of feedback sentences
   */
  function buildFeedback(state) {
    const r = state.resources;
    const lines = [];

    if (state.status === "success") {
      lines.push("You kept a human outpost alive for a full week. On the real Moon or Mars, every one of these systems is interconnected — exactly as you experienced.");
    } else {
      lines.push("This mission ended early — in real spaceflight, life support is unforgiving. Review what ran out and try a different strategy.");
    }

    if (state.health < 60) {
      lines.push("🩺 Crew health ended low. Health recovers when oxygen, water and food all stay above ~30 — feed and hydrate the crew first.");
    } else {
      lines.push("🩺 You kept the crew in good health. Nutrition, water and rest are the foundation of deep-space missions.");
    }

    if (state.radiation >= 60) {
      lines.push("☢️ Radiation finished high. Repairing shielding and sheltering during solar events keeps exposure down — NASA designs storm shelters into every habitat for this reason.");
    } else {
      lines.push("☢️ You managed radiation well. Shielding and storm shelters are a habitat's invisible armor.");
    }

    if (Math.min(r.oxygen, r.water, r.food, r.power) < 20) {
      lines.push("📦 One or more reserves ended nearly empty. Try ending missions with a buffer — real mission planners keep reserve margins for emergencies.");
    }

    if (state.eventsHandled >= 5) {
      lines.push(`🚨 You handled ${state.eventsHandled} emergencies. Reading consequences before choosing is exactly how real flight controllers work through failure trees.`);
    } else {
      lines.push("🚨 Fewer emergencies than usual hit your outpost this run — luck played a role. Replay to see different events!");
    }

    lines.push("🔬 Remember: every number in this game is a simplified teaching value, not a real NASA operational limit. Explore the Learn section for the real science.");
    return lines;
  }

  /** Assemble the full results object for Module 8. */
  function buildResults(state) {
    const score = computeScore(state);
    const stats = Storage.recordMissionResult(score);
    return {
      success: state.status === "success",
      score,
      rating: ratingFor(score),
      feedback: buildFeedback(state),
      stats,
      record: {
        daysSurvived: Math.min(state.day, state.maxDays),
        maxDays: state.maxDays,
        eventsHandled: state.eventsHandled,
        decisions: state.decisions.length,
        decisionsLog: state.decisions,
      },
    };
  }

  return {
    createState,
    performAction,
    canAfford,
    endDay,
    resolveEvent,
    checkMissionEnd,
    computeScore,
    buildResults,
  };
})();

// Expose for console debugging and automated testing.
window.GameEngine = GameEngine;
