/**
 * academy-levels.js — Phase B: detailed configs for the four playable
 * Astronaut Academy tutorial levels.
 *
 * Science rules for this file:
 *   - Every `concept`, `science` and hotspot `fact` line must be
 *     scientifically accurate (checked against NASA sources).
 *   - Simplified for ages 7–12 in words, never in truth.
 *   - Level 3 deliberately corrects the "no gravity in space" myth:
 *     astronauts float because they are always FALLING AROUND Earth
 *     (free fall), not because gravity is absent.
 *
 * Activity types (one instruction at a time):
 *   dragdrop — tap item, tap target (drag&drop + click-click, keyboard-safe)
 *   select   — object selection / decision challenge
 *   order    — simple sequencing puzzle
 *   explore  — interactive discovery (station map / orbit experiment)
 */
const ACADEMY_LEVELS = {
  /* ------------------------------------------------------------------ */
  /* Level 1 — Suit Up, Cadet!                                           */
  /* Concept: a spacesuit supplies air, pressure and protection.         */
  /* ------------------------------------------------------------------ */
  "academy-1": {
    guide: "Hi, Cadet! I'm Astro. Let's get you space-ready!",
    intro: [
      { scene: "🧑‍🚀❓🌌", text: "You are a brand-new space cadet! But wait… space has NO air. Not even one breath!" },
      { scene: "🧑‍🚀➡️👨‍🚀", text: "Good news: your spacesuit is like a tiny spaceship just for you." },
    ],
    steps: [
      {
        type: "dragdrop",
        instruction: "Get dressed! Tap a thing, then tap where it goes on your suit.",
        targets: [
          { id: "head", name: "Head", emoji: "🙂" },
          { id: "back", name: "Backpack", emoji: "🎒" },
          { id: "feet", name: "Boots", emoji: "🦶" },
        ],
        items: [
          { emoji: "⛑️", name: "Helmet", target: "head", correct: true,
            why: "A helmet keeps your head safe and holds your air!" },
          { emoji: "🫧", name: "Air tank", target: "back", correct: true,
            why: "This tank holds the air you breathe in space!" },
          { emoji: "🥾", name: "Space boots", target: "feet", correct: true,
            why: "Sturdy boots keep you steady while you work." },
          { emoji: "🏖️", name: "Beach ball", correct: false,
            rejectWhy: "A beach ball is fun on Earth — but it can't help you breathe!" },
          { emoji: "☂️", name: "Umbrella", correct: false,
            rejectWhy: "It doesn't rain in space. An umbrella won't help!" },
          { emoji: "🥤", name: "Soda", correct: false,
            rejectWhy: "Fizzy soda floats around in space. A tank of air is what you need!" },
        ],
        science: "Space has no air to breathe, so astronauts carry their own oxygen — plus layers that protect them.",
      },
      {
        type: "select",
        instruction: "What does your spacesuit give you?",
        options: [
          { emoji: "🫁", label: "Air to breathe", correct: true,
            science: "Space has no air, so the suit carries oxygen — like a scuba tank in the sea!" },
          { emoji: "🦸", label: "Superpowers", correct: false,
            response: "No suit can give superpowers — but it DOES keep you alive!" },
          { emoji: "🍦", label: "Ice cream", correct: false,
            response: "Yummy! But ice cream can't help you breathe. Try again!" },
        ],
      },
      {
        type: "select",
        instruction: "In space the Sun's light is VERY strong. What does your gold helmet visor do?",
        options: [
          { emoji: "😎", label: "Blocks the harsh Sun", correct: true,
            science: "Space has no air to soften sunlight, so gold visors protect astronauts' eyes — like super sunglasses!" },
          { emoji: "🫥", label: "Makes you invisible", correct: false,
            response: "Astronauts want to be SEEN by their team. Try again!" },
          { emoji: "🎵", label: "Plays music", correct: false,
            response: "Cool idea, but the visor's job is protecting your eyes!" },
        ],
      },
    ],
    outro: "A spacesuit gives you air, keeps you snug, and shields you from the Sun. You are ready for space!",
  },

  /* ------------------------------------------------------------------ */
  /* Level 2 — Ready for Launch!                                         */
  /* Concept: rockets need huge thrust and speed to escape Earth's pull. */
  /* ------------------------------------------------------------------ */
  "academy-2": {
    guide: "Mission Control here! Your rocket is waiting on the pad.",
    intro: [
      { scene: "🚀🏗️🌇", text: "Your rocket stands tall on the launch pad. Fuel tanks full?" },
      { scene: "🌍💪🚀", text: "Earth's gravity pulls EVERYTHING down. To fly to space, a rocket must push up super hard!" },
    ],
    steps: [
      {
        type: "order",
        instruction: "Build the launch checklist! Tap the steps in the right order.",
        items: [
          { emoji: "⛽", name: "Fuel the rocket",
            why: "First: fuel! A rocket drinks more fuel in minutes than a car in years." },
          { emoji: "🌤️", name: "Check the weather",
            why: "Rockets only launch in safe weather — storms are dangerous." },
          { emoji: "🔟", name: "Count down 10…9…8…",
            why: "The famous countdown gets every team ready at the same moment." },
          { emoji: "🚀", name: "LIFTOFF!",
            why: "Engines fire, and the rocket climbs faster than sound!" },
        ],
        science: "Real launches follow careful checklists so nothing is forgotten.",
      },
      {
        type: "select",
        instruction: "Choose the engine power for liftoff!",
        scene: "rocket",
        options: [
          { emoji: "🔅", label: "Just a little", anim: "anim-flop",
            response: "The rocket wobbled and fell back. Gravity won! More power!" },
          { emoji: "🔆", label: "Half power", anim: "anim-flop",
            response: "So close! But Earth's pull is still stronger. Try more power!" },
          { emoji: "🔥", label: "FULL POWER!", anim: "anim-launch", correct: true,
            science: "Liftoff! Rockets must zoom about 8 kilometers EVERY SECOND — faster than any plane — to break away from Earth's pull!" },
        ],
      },
      {
        type: "select",
        instruction: "Why must a rocket go SO fast?",
        options: [
          { emoji: "🌍", label: "To break away from Earth's pull", correct: true,
            science: "Gravity pulls everything toward Earth. Only huge speed lets a rocket climb away and stay in space!" },
          { emoji: "☁️", label: "To look at clouds up close", correct: false,
            response: "Planes do that! Rockets aim much higher. Try again!" },
          { emoji: "⛽", label: "To save fuel", correct: false,
            response: "Fast actually needs MORE fuel — speed is for beating gravity!" },
        ],
      },
    ],
    outro: "You beat Earth's gravity! Rockets escape by burning lots of fuel to go unbelievably fast.",
  },

  /* ------------------------------------------------------------------ */
  /* Level 3 — Floating in Space!                                        */
  /* Concept: orbiting = falling around Earth (free fall), NOT zero      */
  /* gravity. Deliberately corrects the most common myth.                */
  /* ------------------------------------------------------------------ */
  "academy-3": {
    guide: "Welcome aboard! Watch your step — or rather… watch your FLOAT!",
    intro: [
      { scene: "🛰️🌍", text: "Welcome home: the space station, flying 250 miles above Earth!" },
      { scene: "🧑‍🚀🫧💧", text: "Whoa! Everything floats — you, your food, even water drops!" },
    ],
    steps: [
      {
        type: "select",
        instruction: "Why do astronauts float?",
        options: [
          { emoji: "🌌", label: "There is no gravity in space", correct: false,
            response: "Good guess — but that's a myth! Gravity up here is still strong. Watch the next experiment…" },
          { emoji: "🛰️", label: "They are falling around Earth!", correct: true,
            science: "The station is ALWAYS falling — but it moves sideways so fast that it keeps missing the ground!" },
          { emoji: "🪶", label: "Astronauts are very light", correct: false,
            response: "Even heavy astronauts float! There's another reason… try again!" },
        ],
      },
      {
        type: "explore",
        instruction: "Try it yourself! Throw the ball harder — again and again!",
        layout: "orbit",
        throws: [
          "The ball flew a little, then gravity pulled it to the ground.",
          "Harder! It went far… but still fell down.",
          "INCREDIBLE! The ball is falling and falling — and NEVER hits the ground. It's orbiting, just like the space station!",
        ],
        science: "Floating = falling around Earth. Gravity never left — the ground just keeps missing the falling spaceship!",
      },
      {
        type: "select",
        instruction: "How do astronauts move around inside the station?",
        options: [
          { emoji: "🤸", label: "They pull on handles", correct: true,
            science: "Astronauts glide hand-over-hand along rails and handles — like swimming slowly through air!" },
          { emoji: "🪽", label: "They flap magic wings", correct: false,
            response: "Magic wings would be fun — but handles do the real work!" },
          { emoji: "🚲", label: "They ride tiny bikes everywhere", correct: false,
            response: "There IS an exercise bike — but for moving around, they pull on handles!" },
        ],
      },
    ],
    outro: "Astronauts float because they fall around Earth forever. Gravity never went away — the ground just keeps missing them!",
  },

  /* ------------------------------------------------------------------ */
  /* Level 4 — Meet Your Space Station                                   */
  /* Concept: how astronauts live and work aboard the ISS.               */
  /* ------------------------------------------------------------------ */
  "academy-4": {
    guide: "This is a REAL home in space. Let's look around!",
    intro: [
      { scene: "🛰️✨🌍", text: "This is the International Space Station — astronauts really live here!" },
      { scene: "🧑‍🚀👋🔬", text: "Explore the rooms and learn how astronauts live and work up here." },
    ],
    steps: [
      {
        type: "explore",
        instruction: "Tap every room to see what astronauts do there!",
        layout: "station",
        hotspots: [
          { emoji: "🏋️", label: "Gym", fact: "Astronauts exercise about 2 hours EVERY day — without it, their muscles and bones get weak!" },
          { emoji: "♻️", label: "Water recycler", fact: "Sweat and even pee are cleaned into drinking water. Nothing is wasted in space!" },
          { emoji: "🛏️", label: "Sleep bags", fact: "Astronauts zip into sleeping bags attached to the wall — so they don't float away while sleeping!" },
          { emoji: "🪟", label: "Big window", fact: "The station circles Earth every 90 minutes — the crew sees 16 sunrises every day!" },
        ],
        science: "Real facts from the ISS: 250 miles up, exercising daily, recycled water, and sleeping strapped to the wall!",
      },
      {
        type: "select",
        instruction: "Imagine a week with NO exercise. What happens to astronauts?",
        options: [
          { emoji: "🦴", label: "Muscles and bones get weak", correct: true,
            science: "In space, muscles and bones don't need to fight gravity — so they weaken fast. Exercise keeps astronauts strong!" },
          { emoji: "💪", label: "They become super strong", correct: false,
            response: "It's the opposite! Floating makes muscles lazy. Try again!" },
          { emoji: "🙂", label: "Nothing at all", correct: false,
            response: "Something DOES happen — their bodies change. Try again!" },
        ],
      },
      {
        type: "order",
        instruction: "Put an astronaut's day in the right order!",
        items: [
          { emoji: "☀️", name: "Wake up",
            why: "Sunrise number one! The crew gets about 16 sunrises every day." },
          { emoji: "🔬", name: "Do science experiments",
            why: "The station is a flying laboratory — plants, water, robots and more!" },
          { emoji: "🏋️", name: "Exercise",
            why: "About 2 hours of exercise keeps muscles and bones strong." },
          { emoji: "🌙", name: "Sleep in the bag",
            why: "Time to zip into a sleeping bag and float to sleep!" },
        ],
        science: "A real ISS day: wake up, science, exercise, sleep — then repeat, 16 times around Earth!",
      },
    ],
    outro: "Now you know how astronauts live, work, exercise — and even drink recycled water — in space!",
  },
};

// Expose for console debugging and automated testing.
window.ACADEMY_LEVELS = ACADEMY_LEVELS;
