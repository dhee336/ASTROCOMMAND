# ASTRO COMMAND 🛰️

**Junior Astronaut Mission Trainer** — an educational space mission simulation game built for the **NASA Space Apps Challenge 2026**.

Command a lunar or Martian outpost: manage limited life-support resources, protect your astronauts from radiation, respond to emergencies, and keep your crew alive for a full seven-day mission. Every decision has a cost — and every system is connected.

> ⚠️ **Educational model:** all resource values, consumption rates and event outcomes are *simplified game settings invented for play*. They are **not** real NASA operational limits or mission data.

---

## 📌 Project Overview

ASTRO COMMAND is a fully playable browser game. Players act as outpost commanders who must balance **oxygen, water, food and power** while radiation slowly accumulates and the habitat and shielding wear down. Each day brings random emergencies — solar storms, power failures, dust storms, leaks — that must be resolved with meaningful, explained decisions.

## ✨ Features

- **Two playable missions** — Lunar Outpost (Medium) and Martian Outpost (Hard), each with unique parameters, challenges and event pools
- **Mission briefing** — objectives, crew, resources, survival instructions and rules before launch
- **Mission Control dashboard** — 8 live gauges (oxygen, water, food, power, radiation, shielding, habitat, health), progress bar, status indicators and a Chart.js resource-history chart
- **7 command actions per day** with clear costs and benefits (oxygen generator, water recycling, greenhouse, repairs, medical care, solar focus)
- **8 emergency events** with 2–3 choices each — consequences are shown *before* choosing, and every choice has real, deterministic effects
- **Sensible failure conditions** — small dips only warn; the mission ends on hard thresholds (crew health 0, habitat 0, radiation 100)
- **Scoring & rating** — 0–1000 score based on crew health, remaining resources, habitat integrity and emergencies handled, with an educational debrief
- **Auto-save** — mission progress is stored in Local Storage and can be resumed after closing the page; a Reset option clears everything
- **Learn section** — simple-English explanations of ECLSS, oxygen generation, water recycling, space agriculture, radiation and power, with official NASA references
- **Responsive** — polished desktop and mobile layouts

## 🛠️ Technology Stack

| Layer | Choice |
|---|---|
| Structure | HTML5 (single page, section-based screens) |
| Styling | CSS3 (three modular stylesheets, CSS custom properties) |
| Logic | Vanilla JavaScript (modular IIFE modules, no frameworks) |
| Charts | [Chart.js 4](https://www.chartjs.org/) via CDN |
| Persistence | Local Storage |
| Backend | None — runs 100% locally, no API keys, no paid services |

## 🚀 Installation & Running

**No build step and no dependencies are required.**

### Option 1 — open directly
Double-click `index.html`. It runs in any modern browser.

### Option 2 — local web server (recommended)
From the project folder:

```bash
# Python 3
python -m http.server 8123
# then open http://localhost:8123
```

or, if you prefer Node.js:

```bash
npx serve .
```

### For development
Serve the folder and edit any file — refresh the browser to see changes.

## 🎮 Game Mechanics

1. **Choose a mission** (Lunar or Martian) and read the briefing.
2. Each of the **7 mission days** grants **3 action points**. Spend them on command actions:
   - 🫧 Run Oxygen Generator (+15 oxygen, −10 power, −4 water)
   - ♻️ Recycle Water (+12 water, −6 power)
   - 🌱 Tend Greenhouse (+10 food, −5 water, −6 power)
   - 🛠️ Repair Habitat / 🛡️ Repair Shielding / 💉 Medical Care / 🔋 Focus Solar Array
3. **Advance Day** applies consumption, solar recharge, environmental wear and shortage penalties.
4. **Emergencies** (~85% of days) pause the day for a decision with shown consequences.
5. **Warnings vs. failure:** gauges below 35% turn amber, below 15% red — but the crew only bleeds health while a resource is at **zero**, so small dips are recoverable.
6. **Failure:** crew health ≤ 0, habitat ≤ 0, or radiation ≥ 100. **Success:** survive all 7 days.
7. **Score (0–1000)** = crew health (×4) + average reserves (×2.5) + habitat (×1.5) + shielding − radiation/2 + 20 per emergency handled.

## 📁 Project Structure

```
ASTRO-COMMAND/
├── index.html            # All screens: landing, select, briefing, dashboard, results, learn
├── css/
│   ├── style.css         # Base theme: space background, cards, buttons, landing
│   ├── dashboard.css     # Mission control dashboard, event modal, results
│   └── responsive.css    # Tablet / mobile / reduced-motion adjustments
├── js/
│   ├── storage.js        # Local Storage save / load / reset
│   ├── missions.js       # Lunar & Martian mission definitions (simplified game values)
│   ├── resources.js      # Gauges, clamping, status tiers, command actions
│   ├── events.js         # Emergency events with shown consequences
│   ├── game-engine.js    # Day loop, consumption, failure checks, scoring, feedback
│   └── app.js            # Screen routing, dashboard rendering, modal, charts
├── assets/
│   ├── images/           # Reserved for future imagery
│   └── icons/            # Reserved for future icons
├── README.md
└── .gitignore
```

## 🔬 NASA References

The educational content in the **Learn** section is based on official NASA resources:

1. [Environmental Control and Life Support Systems (ECLSS) — NASA](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/)
2. [How Space Radiation Affects Humans — NASA Space Radiation Analysis Group](https://srag.jsc.nasa.gov/SpaceRadiation/How/How.cfm)
3. [Space Crops — NASA Biological & Physical Sciences](https://science.nasa.gov/biological-physical/space-crops/)

The game does **not** display live NASA data, and all in-game numbers are clearly labeled as simplified educational settings.

## 👥 Team Information

**ASTRO COMMAND Cadet Division** — built for the NASA Space Apps Challenge 2026.

| Role | Responsibility |
|---|---|
| Full-stack & game developer | Game engine, resource simulation, Local Storage persistence |
| UI/UX designer | Mission-control interface, space theme, responsive layouts |
| Educational designer | Learning objectives, event design, NASA-referenced content |

*(Add your team member names here before submitting.)*

---

Made with 💜 for NASA Space Apps Challenge 2026.
