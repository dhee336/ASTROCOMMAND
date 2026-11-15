# ASTROCOMMAND 🛰️

**Junior Astronaut Mission Trainer** — an educational space mission simulation game built for the **NASA Space Apps Challenge 2026**.

Command a lunar or Martian outpost: manage limited life-support resources, protect your astronauts from radiation, respond to emergencies, and keep your crew alive for a full seven-day mission. Every decision has a cost — and every system is connected.

> ⚠️ **Educational model:** all resource values, consumption rates and event outcomes are *simplified game settings invented for play*. They are **not** real NASA operational limits or mission data.

---

## 📌 Project Overview

ASTROCOMMAND is a fully playable browser game. Players act as outpost commanders who must balance **oxygen, water, food and power** while radiation slowly accumulates and the habitat and shielding wear down. Each day brings random emergencies — solar storms, power failures, dust storms, leaks — that must be resolved with meaningful, explained decisions.

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
- **Solar system background** — the supplied illustration stays fully visible, with all eight planets and labels upright on every screen
- **Responsive** — polished desktop and mobile layouts

## 🛠️ Technology Stack

| Layer | Choice |
|---|---|
| Structure | HTML5 (single page, section-based screens) |
| Styling | CSS3 (modular stylesheets with CSS custom properties) |
| Logic | Vanilla JavaScript (modular IIFE modules, no frameworks) |
| Charts | [Chart.js 4](https://www.chartjs.org/) via CDN |
| 3D scenes | Three.js via CDN |
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

## 🎬 Demo videos

- [ASTROCOMMAND_NASA_30sec_Demo.mp4](demo/ASTROCOMMAND_NASA_30sec_Demo.mp4) — 30-second project demo
- [Overall_Project_Walkthrough.mp4](demo/Overall_Project_Walkthrough.mp4) — project walkthrough
- [Rocket_Launch_Demo.mp4](demo/Rocket_Launch_Demo.mp4) — ASTRO LAUNCH gameplay

The MP4s are tracked with Git LFS. Install Git LFS before cloning if you want to download and play the video files. The game itself does not require Git LFS.

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
ASTROCOMMAND/
├── assets/
│   ├── images/           # Solar-system background and demo illustrations
│   └── icons/
├── css/                  # Main, dashboard, academy, level, demo and responsive styles
├── demo/                 # Three project demonstration videos (Git LFS)
├── js/                   # Mission engine, Academy, UI, persistence and demo scripts
├── launch/               # Standalone ASTRO LAUNCH game (HTML, CSS and JavaScript)
├── index.html            # Main ASTROCOMMAND application
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

**ASTROCOMMAND Cadet Division** — built for the NASA Space Apps Challenge 2026.

| Role | Responsibility |
|---|---|
| Full-stack & game developer | Game engine, resource simulation, Local Storage persistence |
| UI/UX designer | Mission-control interface, space theme, responsive layouts |
| Educational designer | Learning objectives, event design, NASA-referenced content |

*(Add your team member names here before submitting.)*

---

Made with 💜 for NASA Space Apps Challenge 2026.


## 🚀 ASTRO LAUNCH (bonus game)

A companion 3D rocket game for ages 7–12 lives in [`launch/`](launch/index.html) and is reachable from the **🚀 Launch** link in the top navigation (beside Home). Fly a simulated Earth-to-Moon mission: build the rocket, load fuel, board, count down, launch, navigate, land and drive the rover.

- Standalone: it has its own `launch/css/launch.css` and `launch/js/launch.js`, and it does not touch ASTROCOMMAND's code or saved data (Local Storage key `astro-launch`).
- Uses Three.js r128 from the cdnjs CDN, so an internet connection is needed.
- All numbers are simplified simulation values, not real NASA data. This is not an official NASA simulator.
- The Moon mission is playable; the Mars mission is not built yet.
