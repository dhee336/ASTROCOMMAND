/**
 * events.js — Emergency events (Module 6).
 *
 * Every event explains the situation, offers 2–3 decisions, and shows the
 * consequences of each decision BEFORE the player chooses. Outcomes are
 * deterministic (no hidden dice) so the game teaches clear cause and effect.
 *
 * ⚠️ Situations and numbers are simplified game fiction inspired by real
 *    space hazards — not real NASA procedures or limits.
 */
const Events = (() => {
  "use strict";

  /** Build the full event catalogue. */
  const EVENTS = [
    {
      id: "solar-storm",
      mission: "both",
      weight: 3,
      title: "Solar Radiation Warning",
      icon: "☀️",
      description:
        "Sensors detect a burst of solar particles heading toward the outpost. " +
        "High exposure could sicken the crew and damage unshielded electronics.",
      choices: [
        {
          label: "Shelter crew in the storm bunker (6 h)",
          consequence: "−8 power, −4 food · radiation barely rises",
          edu: "Storm shelters with thick shielding are the standard protection during solar particle events.",
          apply(state) {
            Resources.applyDeltas(state, { power: -8, food: -4, radiation: 2, health: 2 });
            return "The crew rides out the storm safely. Radiation exposure stays low, but the workday is lost.";
          },
        },
        {
          label: "Continue full operations during the storm",
          consequence: "radiation +18 · power +5, food +6 (work gets done)",
          edu: "Solar particle events can deliver a dangerous dose in hours — continuing EVA work is a real gamble.",
          apply(state) {
            Resources.applyDeltas(state, { radiation: 18, power: 5, food: 6, health: -4 });
            return "The crew pushes through and production stays up, but everyone absorbed a significant radiation dose.";
          },
        },
        {
          label: "Emergency-shield the greenhouse only",
          consequence: "−10 shielding, radiation +6 · food +5",
          edu: "Choosing what to shield is a real trade-off: you cannot protect everything at once.",
          apply(state) {
            Resources.applyDeltas(state, { shielding: -10, radiation: 6, food: 5 });
            return "Crops survive under the emergency shield, but the crew took moderate exposure.";
          },
        },
      ],
    },

    {
      id: "power-failure",
      mission: "both",
      weight: 3,
      title: "Power System Failure",
      icon: "⚡",
      description:
        "A main power bus shorts out. Half the habitat loses electricity and " +
        "battery reserves are draining fast.",
      choices: [
        {
          label: "Reroute power from life support",
          consequence: "power +10 · oxygen −8",
          edu: "Air generators are the biggest power consumers in a habitat — cutting them has instant consequences.",
          apply(state) {
            Resources.applyDeltas(state, { power: 10, oxygen: -8 });
            return "Power is restored to critical systems, but the oxygen generator ran at half capacity.";
          },
        },
        {
          label: "Full shutdown and careful repair",
          consequence: "power +6, habitat +2 · lose 1 action point tomorrow",
          edu: "Methodical repairs prevent further damage but cost precious time.",
          apply(state) {
            Resources.applyDeltas(state, { power: 6, habitat: 2 });
            state.apPenaltyNextDay += 1;
            return "The bus is repaired properly. Tomorrow's maintenance schedule will be tight.";
          },
        },
        {
          label: "Ignore it and hope it holds",
          consequence: "power −10, habitat −12",
          edu: "Neglected electrical faults rarely fix themselves — they spread.",
          apply(state) {
            Resources.applyDeltas(state, { power: -10, habitat: -12 });
            return "The fault spreads overnight. Several habitat sections lose heating and a seal cracks.";
          },
        },
      ],
    },

    {
      id: "water-leak",
      mission: "both",
      weight: 3,
      title: "Water Leakage",
      icon: "💧",
      description:
        "A storage tank line has sprung a leak in the utility corridor. " +
        "Clean water is pooling where it shouldn't.",
      choices: [
        {
          label: "Seal the leak and recover the water",
          consequence: "water +6 · power −5",
          edu: "Every drop counts off Earth — recovered water goes straight back through the recycler.",
          apply(state) {
            Resources.applyDeltas(state, { water: 6, power: -5 });
            return "The leak is sealed and the spilled water is recovered into the recycler.";
          },
        },
        {
          label: "Impose strict water rationing",
          consequence: "water +2 · crew health −6",
          edu: "Dehydration degrades concentration and morale long before it becomes visible.",
          apply(state) {
            Resources.applyDeltas(state, { water: 2, health: -6 });
            return "Rationing stops the worst of the loss, but the crew is thirsty and unhappy.";
          },
        },
        {
          label: "Ignore the leak for now",
          consequence: "water −15, habitat −5",
          edu: "In microgravity or low pressure, even small leaks can escalate quickly.",
          apply(state) {
            Resources.applyDeltas(state, { water: -15, habitat: -5 });
            return "Overnight the leak worsens. Precious water is lost and the corridor floor corrodes.";
          },
        },
      ],
    },

    {
      id: "oxygen-malfunction",
      mission: "both",
      weight: 3,
      title: "Oxygen System Malfunction",
      icon: "💨",
      description:
        "The primary oxygen generator reports a sensor fault and has throttled " +
        "itself to minimum output. Cabin oxygen is slowly falling.",
      choices: [
        {
          label: "Switch to backup oxygen tanks",
          consequence: "oxygen +10 · power −8",
          edu: "Backup reserves exist for exactly this — but they must be recharged, which costs power.",
          apply(state) {
            Resources.applyDeltas(state, { oxygen: 10, power: -8 });
            return "Backup tanks stabilize the cabin atmosphere. The resupply pumps drain the batteries.";
          },
        },
        {
          label: "Manual repair while wearing masks",
          consequence: "oxygen +4 · crew health −8",
          edu: "Repairing life support while breathing from masks is stressful, heavy work.",
          apply(state) {
            Resources.applyDeltas(state, { oxygen: 4, health: -8 });
            return "The team fixes the sensor fault in shifts, exhausted but successful.";
          },
        },
        {
          label: "Run at minimum and reassess tomorrow",
          consequence: "oxygen −12, health −6",
          edu: "Oxygen problems compound: low O₂ impairs judgement, making the next decision worse.",
          apply(state) {
            Resources.applyDeltas(state, { oxygen: -12, health: -6 });
            return "The generator sputters along. By morning the whole crew has a headache.";
          },
        },
      ],
    },

    {
      id: "crop-failure",
      mission: "both",
      weight: 2,
      title: "Crop Production Failure",
      icon: "🌱",
      description:
        "A nutrient pump fault has wilted half the greenhouse racks. " +
        "The next harvest is now delayed.",
      choices: [
        {
          label: "Switch to emergency rations",
          consequence: "food +6 · crew health −4",
          edu: "Rations are safe but unappetizing — nutrition and morale both take a hit.",
          apply(state) {
            Resources.applyDeltas(state, { food: 6, health: -4 });
            return "Emergency rations cover the shortfall, though the crew misses fresh greens.";
          },
        },
        {
          label: "Redistribute remaining plants and compost",
          consequence: "food +2, water +4",
          edu: "Composting failed biomass returns water and nutrients to the system.",
          apply(state) {
            Resources.applyDeltas(state, { food: 2, water: 4 });
            return "The salvage operation recovers some biomass and reclaims irrigation water.";
          },
        },
        {
          label: "Ignore the greenhouse this cycle",
          consequence: "food −14",
          edu: "A dead crop rack won't produce again until it is fully replanted and regrown.",
          apply(state) {
            Resources.applyDeltas(state, { food: -14 });
            return "The affected racks die completely. The food reserve takes a serious hit.";
          },
        },
      ],
    },

    {
      id: "equipment-damage",
      mission: "both",
      weight: 2,
      title: "Equipment Damage",
      icon: "🛠️",
      description:
        "A joint on the habitat's primary pressure door is grinding and " +
        "venting slowly. Engineering says it will fail without attention.",
      choices: [
        {
          label: "Repair it properly now",
          consequence: "power −7, habitat +6",
          edu: "Preventive maintenance is always cheaper than emergency repair.",
          apply(state) {
            Resources.applyDeltas(state, { power: -7, habitat: 6 });
            return "The door joint is machined and resealed. The habitat is structurally sounder than before.";
          },
        },
        {
          label: "Apply an improvised patch",
          consequence: "habitat −4, crew health −3",
          edu: "Duct-tape engineering buys time, not reliability.",
          apply(state) {
            Resources.applyDeltas(state, { habitat: -4, health: -3 });
            return "The patch holds for now, but the crew loses sleep monitoring the pressure alarm.";
          },
        },
        {
          label: "Ignore until tomorrow",
          consequence: "habitat −14",
          edu: "Pressure doors are safety-critical: a failing one can depressurize an entire section.",
          apply(state) {
            Resources.applyDeltas(state, { habitat: -14 });
            return "Overnight the joint fails. A whole section loses pressure and is sealed off.";
          },
        },
      ],
    },

    {
      id: "dust-storm",
      mission: "martian",
      weight: 4,
      title: "Dust Storm",
      icon: "🌪️",
      description:
        "A regional dust storm is moving over the outpost. Visibility drops to " +
        "zero and fine dust begins coating every exterior surface and seal.",
      choices: [
        {
          label: "Seal the habitat and wait it out",
          consequence: "power −10, food −5 · radiation −4",
          edu: "Mars dust storms can last weeks; shelters protect both crew and solar panels.",
          apply(state) {
            Resources.applyDeltas(state, { power: -10, food: -5, radiation: -4 });
            return "The crew shelters safely. The storm scours the panels but the habitat stays sealed.";
          },
        },
        {
          label: "Continue outdoor operations",
          consequence: "habitat −10, shielding −8, radiation +12",
          edu: "Martian dust is electrostatic and abrasive — it clings to suits and invades every mechanism.",
          apply(state) {
            Resources.applyDeltas(state, { habitat: -10, shielding: -8, radiation: 12, health: -5 });
            return "Essential work gets done, but dust infiltrates the airlocks and the crew inhales trace amounts.";
          },
        },
        {
          label: "Deploy electrostatic dust filters",
          consequence: "power −6, habitat +4",
          edu: "Electrostatic repulsion is a leading concept for keeping Martian dust off equipment.",
          apply(state) {
            Resources.applyDeltas(state, { power: -6, habitat: 4 });
            return "The filters keep most dust out of the intake systems. The habitat fares well.";
          },
        },
      ],
    },

    {
      id: "comms-disruption",
      mission: "both",
      weight: 2,
      title: "Communication Disruption",
      icon: "📡",
      description:
        "The high-gain antenna lost lock. Mission Control's guidance and " +
        "telemetry streams are down — the crew is on its own.",
      choices: [
        {
          label: "Reboot the comms array",
          consequence: "power −5 · connection restored",
          edu: "Most spacecraft comms faults are fixed by a controlled reboot of the radio chain.",
          apply(state) {
            Resources.applyDeltas(state, { power: -5 });
            state.bonusScore += 15;
            return "The array reacquires signal within the hour. Mission Control sends a well-earned 'well done'.";
          },
        },
        {
          label: "Switch to the backup relay",
          consequence: "crew health −3 (stressful manual reconfiguration)",
          edu: "Backup relays have narrow windows and require manual pointing — tense, tiring work.",
          apply(state) {
            Resources.applyDeltas(state, { health: -3 });
            state.bonusScore += 5;
            return "The backup relay connects through a narrow window. Comms restored, nerves frayed.";
          },
        },
        {
          label: "Postpone comms until tomorrow",
          consequence: "habitat −3 · mission log gap",
          edu: "Time without ground support means unreviewed maintenance and unverified repairs.",
          apply(state) {
            Resources.applyDeltas(state, { habitat: -3 });
            return "The crew works without guidance for a day. A scheduled maintenance check is missed.";
          },
        },
      ],
    },

    {
      id: "moonquake",
      mission: "lunar",
      weight: 3,
      title: "Shallow Moonquake",
      icon: "🌑",
      description:
        "Seismographs register a shallow moonquake. The habitat rattles and " +
        "loose equipment falls from shelves.",
      choices: [
        {
          label: "Full evacuation to the bunker and inspection",
          consequence: "power −6, food −3 · habitat +2",
          edu: "The Moon rings like a bell — shallow quakes can last tens of minutes and are strong enough to damage structures.",
          apply(state) {
            Resources.applyDeltas(state, { power: -6, food: -3, habitat: 2 });
            return "The crew shelters and then completes a full structural inspection. No damage found.";
          },
        },
        {
          label: "Send engineers to reinforce the frame",
          consequence: "habitat +8 · crew health −4",
          edu: "Reinforcing critical load points is heavy, hazardous work during aftershocks.",
          apply(state) {
            Resources.applyDeltas(state, { habitat: 8, health: -4 });
            return "The frame is braced with extra struts. The engineers are exhausted but proud.";
          },
        },
        {
          label: "Continue normal operations",
          consequence: "habitat −10, shielding −5",
          edu: "Repeated shaking fatigues structural joints — damage accumulates silently.",
          apply(state) {
            Resources.applyDeltas(state, { habitat: -10, shielding: -5 });
            return "After the shaking stops, cracks are found in two wall panels and a shielding block is loose.";
          },
        },
      ],
    },
  ];

  /**
   * Pick a weighted random event valid for the given mission.
   * @param {string} missionKey - 'lunar' | 'martian'
   * @returns {object|null} event or null (~15% calm day)
   */
  function rollEvent(missionKey) {
    if (Math.random() > 0.85) return null; // rare calm day
    const pool = EVENTS.filter(
      (e) => e.mission === "both" || e.mission === missionKey
    );
    const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const event of pool) {
      roll -= event.weight;
      if (roll <= 0) return event;
    }
    return pool[pool.length - 1];
  }

  return { EVENTS, rollEvent };
})();
