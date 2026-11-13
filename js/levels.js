/**
 * levels.js — Phase A foundation: Academy sections and level definitions.
 *
 * Pure data. Every child-facing string is short, simple and jargon-free
 * (ages 7–12). Each level teaches exactly one space concept, which the
 * child meets *while playing* — never as a paragraph.
 *
 * Level statuses:
 *   "planned" — the level exists in the design; playable in a later phase.
 *               The hub shows it honestly as "Soon".
 *   "ready"   — playable today. Phase A: the two original missions
 *               (Master Commander), which run through the existing,
 *               untouched game engine.
 *
 * ⚠️ Science note: `concept` lines must stay scientifically accurate.
 *    Simplified game numbers are never presented as real NASA values.
 */
const LEVELS = (() => {
  "use strict";

  const SECTIONS = [
    {
      id: "academy",
      icon: "🎓",
      name: "Astronaut Academy",
      tagline: "Learn the basics of living in space",
      theme: "theme-academy",
      unlockAfter: null,
      kind: "levels",
      levels: [
        {
          id: "academy-1", icon: "💨", title: "Suit Up, Cadet!",
          concept: "A spacesuit gives astronauts air, pressure and protection — like a tiny spaceship you wear.",
          status: "ready",
        },
        {
          id: "academy-2", icon: "🚀", title: "Ready for Launch!",
          concept: "Rockets escape Earth's gravity by pushing up with huge thrust and incredible speed.",
          status: "ready",
        },
        {
          id: "academy-3", icon: "🛰️", title: "Floating in Space!",
          concept: "Astronauts float because they are always falling around Earth — not because gravity is gone.",
          status: "ready",
        },
        {
          id: "academy-4", icon: "🛰️", title: "Meet Your Space Station",
          concept: "Astronauts live, work, exercise and even drink recycled water aboard the ISS.",
          status: "ready",
        },
      ],
    },

    {
      id: "moon",
      icon: "🌕",
      name: "Moon Adventures",
      tagline: "Command the first outpost on the Moon",
      theme: "theme-moon",
      unlockAfter: "academy",
      kind: "levels",
      levels: [
        {
          id: "moon-1", icon: "🌙", title: "Night Falls on the Moon",
          concept: "One Moon night lasts about 14 Earth days — no sunlight for solar panels.",
          status: "planned",
        },
        {
          id: "moon-2", icon: "🌫️", title: "Sticky Moon Dust",
          concept: "Moon dust is sharp and clingy. It scratches seals and machines.",
          status: "planned",
        },
        {
          id: "moon-3", icon: "☢️", title: "Rays from the Sun",
          concept: "The Moon has no air to block radiation, so crews shelter during solar storms.",
          status: "planned",
        },
        {
          id: "moon-4", icon: "🌋", title: "The Moon Shakes",
          concept: "The Moon has real earthquakes — called moonquakes — that can last a long time.",
          status: "planned",
        },
        {
          id: "moon-5", icon: "🏆", title: "Moon Base Complete",
          concept: "A good commander keeps a little extra of everything — just in case.",
          status: "planned",
        },
      ],
    },

    {
      id: "station",
      icon: "🛰️",
      name: "Space Station",
      tagline: "Fly the recycling space station",
      theme: "theme-station",
      unlockAfter: "moon",
      kind: "levels",
      levels: [
        {
          id: "station-1", icon: "♻️", title: "Water Wizard",
          concept: "The ISS recycler turns sweat and breath moisture into drinking water.",
          status: "planned",
        },
        {
          id: "station-2", icon: "💨", title: "Oxygen Maker",
          concept: "Electricity splits water into oxygen for the crew to breathe.",
          status: "planned",
        },
        {
          id: "station-3", icon: "🌱", title: "Space Salad",
          concept: "Astronauts grow lettuce and tomatoes without soil under LED lights.",
          status: "planned",
        },
        {
          id: "station-4", icon: "📡", title: "Call Home",
          concept: "Space stations talk to Earth using big dish antennas.",
          status: "planned",
        },
      ],
    },

    {
      id: "mars",
      icon: "🔴",
      name: "Mars Expedition",
      tagline: "Lead the team on the red planet",
      theme: "theme-mars",
      unlockAfter: "station",
      kind: "levels",
      levels: [
        {
          id: "mars-1", icon: "🌪️", title: "Dust Storm!",
          concept: "Mars dust storms can cover the whole planet and last for weeks.",
          status: "planned",
        },
        {
          id: "mars-2", icon: "🥬", title: "Farm on Mars",
          concept: "Martian soil has plant food in it, but also chemicals plants don't like.",
          status: "planned",
        },
        {
          id: "mars-3", icon: "❄️", title: "Cold and Thin",
          concept: "Mars air is very thin and much colder than Earth's.",
          status: "planned",
        },
        {
          id: "mars-4", icon: "🏆", title: "Mars Complete",
          concept: "Mars has seasons and a day about as long as Earth's.",
          status: "planned",
        },
      ],
    },

    {
      id: "scientists",
      icon: "🔬",
      name: "Space Scientists",
      tagline: "Solve puzzles like a real scientist",
      theme: "theme-scientists",
      unlockAfter: "mars",
      kind: "puzzles",
      levels: [
        {
          id: "sci-1", icon: "💧", title: "Water Loop Puzzle",
          concept: "Every drop on the space station is used again and again.",
          status: "planned",
        },
        {
          id: "sci-2", icon: "📊", title: "Read the Graph",
          concept: "Scientists use graphs to spot when something is going wrong.",
          status: "planned",
        },
        {
          id: "sci-3", icon: "🧩", title: "Launch Checklist",
          concept: "Real launches follow careful checklists so nothing is forgotten.",
          status: "planned",
        },
        {
          id: "sci-4", icon: "🔭", title: "Planet Match",
          concept: "Each planet is different — Mars is red, Jupiter is the biggest.",
          status: "planned",
        },
      ],
    },

    {
      id: "master",
      icon: "🚀",
      name: "Master Commander",
      tagline: "The full 7-day mission simulator",
      theme: "theme-master",
      unlockAfter: null,          // always unlocked — the original game
      kind: "missions",
      levels: [
        {
          id: "master-lunar", icon: "🌕", title: "Lunar Outpost",
          concept: "Keep 4 astronauts alive for 7 days on the Moon.",
          status: "ready", ref: "lunar",
          starPar: [250, 400, 550],
        },
        {
          id: "master-martian", icon: "🔴", title: "Martian Outpost",
          concept: "Keep 6 astronauts alive for 7 days on Mars. Harder than the Moon!",
          status: "ready", ref: "martian",
          starPar: [250, 400, 550],
        },
      ],
    },
  ];

  /* ---------- accessors ---------- */

  function allSections() {
    return SECTIONS;
  }

  function getSection(id) {
    return SECTIONS.find((s) => s.id === id) || null;
  }

  function findLevel(levelId) {
    for (const s of SECTIONS) {
      const level = s.levels.find((l) => l.id === levelId);
      if (level) return level;
    }
    return null;
  }

  /** Map an existing mission key to its Master Commander level id. */
  function missionLevelId(missionKey) {
    const level = SECTIONS
      .flatMap((s) => s.levels)
      .find((l) => l.status === "ready" && l.ref === missionKey);
    return level ? level.id : null;
  }

  return { allSections, getSection, findLevel, missionLevelId };
})();

// Expose for console debugging and automated testing.
window.LEVELS = LEVELS;
