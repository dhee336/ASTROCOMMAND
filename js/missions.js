/**
 * missions.js — Mission definitions for ASTRO COMMAND.
 *
 * ⚠️ All values are SIMPLIFIED GAME SETTINGS invented for play.
 *    They are not real NASA operational limits or mission data.
 *
 * Resource model (all 0–100, clamped):
 *   oxygen / water / food / power : life-support pools the player manages
 *   radiation                     : cumulative crew exposure (dangerous near 100)
 *   shielding                     : condition of radiation shielding
 *   habitat                       : structural condition of the outpost
 *   health                        : crew health (0 = mission failure)
 */
const MISSIONS = {
  lunar: {
    key: "lunar",
    name: "Lunar Outpost",
    icon: "🌕",
    difficulty: "Medium",
    difficultyClass: "chip--medium",
    durationDays: 7,
    crewSize: 4,
    description:
      "Command a four-person habitat near the lunar south pole. Two-week nights, " +
      "abrasive dust and constant radiation test every system you manage.",
    challenges: [
      "No atmosphere — full radiation exposure during solar events",
      "14-day night: solar power is limited (simplified in-game as weak recharge)",
      "Abrasive lunar dust degrades equipment and seals",
      "Resupply is impossible inside a 7-day window",
    ],
    objective:
      "Keep your crew of 4 alive and healthy for 7 mission days at the lunar outpost. " +
      "Balance oxygen, water, food and power while radiation and dust wear down your systems.",
    // Simplified daily resource changes applied each time the day advances.
    dailyConsumption: {
      oxygen: -12,   // crew breathing + leaks
      water:  -9,    // drinking, hygiene, recycling losses
      food:   -9,    // meals for the crew
      power:  -7,    // life support, heaters, comms
    },
    // Simplified trickle recharge (solar panels during the lunar day).
    dailyRecharge: { power: 3 },
    dailyWear: { radiation: 6, shielding: -3, habitat: -3 },
    start: {
      oxygen: 80, water: 75, food: 70, power: 85,
      radiation: 10, shielding: 70, habitat: 80, health: 100,
    },
  },

  martian: {
    key: "martian",
    name: "Martian Outpost",
    icon: "🔴",
    difficulty: "Hard",
    difficultyClass: "chip--hard",
    durationDays: 7,
    crewSize: 6,
    description:
      "Lead a six-person research base on Mars. Dust storms, weak sunlight and a thin " +
      "CO₂ atmosphere make every resource stretch further than it wants to.",
    challenges: [
      "Global dust storms block sunlight and abrade seals",
      "Thin CO₂ atmosphere — weak protection from radiation",
      "Solar power yields less than on the Moon (simplified in-game)",
      "Longer nights and colder conditions strain habitat systems",
    ],
    objective:
      "Keep your crew of 6 alive and healthy for 7 mission days at the Martian outpost. " +
      "Resources are tighter, storms hit harder, and mistakes cost more than on the Moon.",
    dailyConsumption: {
      oxygen: -14,
      water: -10,
      food: -10,
      power: -8,
    },
    // Dust-laden Martian skies give solar panels less to work with.
    dailyRecharge: { power: 2 },
    dailyWear: { radiation: 9, shielding: -4, habitat: -4 },
    start: {
      oxygen: 75, water: 70, food: 65, power: 80,
      radiation: 12, shielding: 65, habitat: 78, health: 100,
    },
  },
};

/** Convenience accessor with validation. */
function getMission(key) {
  return MISSIONS[key] || null;
}
