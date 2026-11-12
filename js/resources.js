/**
 * resources.js — Resource metadata, clamping and the command-action catalogue.
 *
 * ⚠️ All costs/benefits are simplified game settings, not real NASA values.
 */
const Resources = (() => {
  "use strict";

  /** Clamp helper: resources may never drop below 0 or exceed their max. */
  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Apply a set of numeric deltas to the state, clamping every resource.
   * Deltas are rounded to one decimal to keep the log readable.
   * @param {object} state - game state
   * @param {object} deltas - e.g. { oxygen: -8, power: +6 }
   */
  function applyDeltas(state, deltas = {}) {
    const r = state.resources;
    for (const [key, delta] of Object.entries(deltas)) {
      if (key === "resources" || typeof delta !== "number") continue;
      if (key in r) {
        r[key] = clamp(Math.round((r[key] + delta) * 10) / 10);
      } else if (key in state) {
        // radiation, shielding, habitat, health live on state directly
        state[key] = clamp(Math.round((state[key] + delta) * 10) / 10);
      }
    }
  }

  /** Display metadata for the six tracked gauges. */
  const GAUGES = [
    { id: "oxygen",    label: "Oxygen",            icon: "💨", group: "life" },
    { id: "water",     label: "Water",             icon: "💧", group: "life" },
    { id: "food",      label: "Food",              icon: "🥫", group: "life" },
    { id: "power",     label: "Power",             icon: "⚡", group: "life" },
    { id: "radiation", label: "Radiation Exposure", icon: "☢️", group: "systems" },
    { id: "shielding", label: "Shielding Condition", icon: "🛡️", group: "systems" },
    { id: "habitat",   label: "Habitat Condition", icon: "🏠", group: "systems" },
    { id: "health",    label: "Astronaut Health",  icon: "❤️", group: "systems" },
  ];

  /**
   * Status tier for a gauge value.
   * For `radiation` higher is worse; for everything else higher is better.
   */
  function statusOf(id, value) {
    const v = clamp(value);
    if (id === "radiation") {
      if (v >= 85) return "critical";
      if (v >= 60) return "warn";
      return "good";
    }
    if (v <= 15) return "critical";
    if (v <= 35) return "warn";
    return "good";
  }

  /** Overall mission status chip based on the worst current gauge. */
  function overallStatus(state) {
    const checks = ["oxygen", "water", "food", "power", "shielding", "habitat", "health"];
    let worst = "good";
    for (const id of checks) {
      const s = statusOf(id, state.resources[id] ?? state[id]);
      if (s === "critical") return "critical";
      if (s === "warn") worst = "warn";
    }
    if (statusOf("radiation", state.radiation) !== "good") worst = "warn";
    return worst;
  }

  /**
   * Command actions — Module 5 resource management.
   * Each costs action points (ap) and resources; each gives clear benefits.
   * Costs/benefits are simplified game values.
   */
  const ACTIONS = [
    {
      id: "oxygen-boost",
      icon: "💨",
      name: "Run Oxygen Generator",
      ap: 1,
      desc: "Electrolysis splits water into extra breathing oxygen.",
      cost: "−10 power, −4 water",
      benefit: "+15 oxygen",
      deltas: { oxygen: 15, power: -10, water: -4 },
      note: "Oxygen generators use electricity to split water — no power, no air.",
    },
    {
      id: "recycle-water",
      icon: "♻️",
      name: "Recycle Water",
      ap: 1,
      desc: "Reclaim humidity and wastewater through the recycler.",
      cost: "−6 power",
      benefit: "+12 water",
      deltas: { water: 12, power: -6 },
      note: "The ISS recycler reclaims water from sweat, breath and even urine.",
    },
    {
      id: "tend-crops",
      icon: "🌱",
      name: "Tend Greenhouse",
      ap: 1,
      desc: "Irrigate and tend the hydroponic crop racks.",
      cost: "−5 water, −6 power",
      benefit: "+10 food",
      deltas: { food: 10, water: -5, power: -6 },
      note: "Space crops grow under LED light without soil — but they still drink.",
    },
    {
      id: "repair-habitat",
      icon: "🛠️",
      name: "Repair Habitat",
      ap: 1,
      desc: "Patch seals, dust filters and structural joints.",
      cost: "−10 power",
      benefit: "+12 habitat condition",
      deltas: { habitat: 12, power: -10 },
      note: "Abrasive dust slowly degrades every seal on an outpost.",
    },
    {
      id: "repair-shielding",
      icon: "🛡️",
      name: "Repair Shielding",
      ap: 1,
      desc: "Reinforce radiation shielding and storm shelter layers.",
      cost: "−8 power",
      benefit: "+12 shielding, −6 radiation",
      deltas: { shielding: 12, radiation: -6, power: -8 },
      note: "On the Moon and Mars, habitat walls are the crew's only radiation shield.",
    },
    {
      id: "medical-care",
      icon: "💉",
      name: "Medical Care",
      ap: 1,
      desc: "Health checks, treatment and rest rotation for the crew.",
      cost: "−4 food, −3 water",
      benefit: "+10 crew health",
      deltas: { health: 10, food: -4, water: -3 },
      note: "Good nutrition and medical care speed up recovery from fatigue.",
    },
    {
      id: "charge-panels",
      icon: "🔋",
      name: "Focus Solar Array",
      ap: 1,
      desc: "Re-aim panels and route every watt into the batteries.",
      cost: "−3 oxygen (vent work air)",
      benefit: "+10 power",
      deltas: { power: 10, oxygen: -3 },
      note: "Tracking sunlight precisely can squeeze extra charge out of a small array.",
    },
  ];

  return { clamp, applyDeltas, GAUGES, statusOf, overallStatus, ACTIONS };
})();
