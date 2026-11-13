/**
 * progression.js — Phase A foundation: stars, badges and unlock progress.
 *
 * Persistent kid-progress for the Academy, stored in LocalStorage under
 * "astro-command-progression-v1". Separate from the mission save
 * ("astro-command-save-v1") and lifetime stats ("astro-command-stats-v1"),
 * which keep working exactly as before.
 *
 * Design rules:
 *   - Read-only use of the existing Storage module (no engine edits).
 *   - All data is anonymous: no accounts, no personal information.
 *   - Stars are 1–3 per level, derived from level score "par" thresholds.
 *   - Sections unlock when the previous section is complete (data-driven
 *     via LEVELS, so the Academy can never soft-lock).
 */
const Progression = (() => {
  "use strict";

  const KEY = "astro-command-progression-v1";
  const DEFAULT_DATA = { version: 1, levels: {}, badges: [] };

  let cache = null;

  /** Load (and lazily repair) the progression blob. */
  function data() {
    if (cache) return cache;
    let parsed = null;
    try {
      parsed = JSON.parse(localStorage.getItem(KEY));
    } catch {
      parsed = null;
    }
    if (!parsed || typeof parsed !== "object") parsed = {};
    cache = {
      version: 1,
      levels: parsed.levels && typeof parsed.levels === "object" ? parsed.levels : {},
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
    };
    return cache;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data()));
    } catch (err) {
      console.warn("ASTRO ACADEMY: could not save progress.", err);
    }
  }

  /* ---------- stars ---------- */

  /** Stars already earned for a level (0–3). */
  function getStars(levelId) {
    const rec = data().levels[levelId];
    return rec && typeof rec.stars === "number" ? Math.max(0, Math.min(3, rec.stars)) : 0;
  }

  /**
   * Convert a level score into 1–3 stars using the level's par thresholds
   * (levels.js). Below the first par = 0 stars but the level still counts
   * as attempted — a child is never punished for trying.
   */
  function starsForScore(levelId, score) {
    const level = typeof LEVELS !== "undefined" ? LEVELS.findLevel(levelId) : null;
    if (!level || !Array.isArray(level.starPar) || !level.starPar.length) {
      return score > 0 ? 1 : 0;
    }
    let stars = 0;
    for (const par of level.starPar) if (score >= par) stars += 1;
    return stars;
  }

  /** Best score recorded for a level (0 if never played). */
  function bestScore(levelId) {
    const rec = data().levels[levelId];
    return rec && typeof rec.bestScore === "number" ? rec.bestScore : 0;
  }

  /** Record a finished level: keeps the best stars and best score. */
  function recordLevel(levelId, stars, score) {
    const d = data();
    const rec = d.levels[levelId] || { stars: 0, bestScore: 0, plays: 0 };
    rec.plays = (rec.plays || 0) + 1;
    rec.stars = Math.max(rec.stars, Math.max(0, Math.min(3, stars || 0)));
    if (typeof score === "number") rec.bestScore = Math.max(rec.bestScore, score);
    d.levels[levelId] = rec;
    save();
    return rec;
  }

  /* ---------- section-level helpers (computed from LEVELS) ---------- */

  function starsInSection(sectionId) {
    const section = typeof LEVELS !== "undefined" ? LEVELS.getSection(sectionId) : null;
    if (!section) return 0;
    return section.levels.reduce((sum, l) => sum + getStars(l.id), 0);
  }

  function maxStarsInSection(sectionId) {
    const section = typeof LEVELS !== "undefined" ? LEVELS.getSection(sectionId) : null;
    if (!section) return 0;
    return section.levels.length * 3;
  }

  /** A section is complete when every level has at least 1 star. */
  function isSectionComplete(sectionId) {
    const section = typeof LEVELS !== "undefined" ? LEVELS.getSection(sectionId) : null;
    if (!section || !section.levels.length) return false;
    return section.levels.every((l) => getStars(l.id) >= 1);
  }

  /** A section is unlocked when it has no prerequisite or it is complete. */
  function isSectionUnlocked(section) {
    if (!section.unlockAfter) return true;
    return isSectionComplete(section.unlockAfter);
  }

  /** How many levels of a section have at least 1 star. */
  function completedLevelsInSection(sectionId) {
    const section = typeof LEVELS !== "undefined" ? LEVELS.getSection(sectionId) : null;
    if (!section) return 0;
    return section.levels.filter((l) => getStars(l.id) >= 1).length;
  }

  function totalStars() {
    if (typeof LEVELS === "undefined") return 0;
    return LEVELS.allSections().reduce((sum, s) => sum + starsInSection(s.id), 0);
  }

  function totalMaxStars() {
    if (typeof LEVELS === "undefined") return 0;
    return LEVELS.allSections().reduce((sum, s) => sum + maxStarsInSection(s.id), 0);
  }

  /* ---------- badges ---------- */

  function hasBadge(badgeId) {
    return data().badges.includes(badgeId);
  }

  /** Award a badge once. Returns true when it is newly earned. */
  function earnBadge(badgeId) {
    const d = data();
    if (d.badges.includes(badgeId)) return false;
    d.badges.push(badgeId);
    save();
    return true;
  }

  /* ---------- summary & lifecycle ---------- */

  function summary() {
    return {
      stars: totalStars(),
      maxStars: totalMaxStars(),
      badges: data().badges.length,
      levelsCompleted:
        typeof LEVELS !== "undefined"
          ? LEVELS.allSections().reduce(
              (sum, s) => sum + completedLevelsInSection(s.id),
              0
            )
          : 0,
    };
  }

  /** Full wipe (used by the app's Reset button along with Storage.clearAll). */
  function resetAll() {
    try {
      localStorage.removeItem(KEY);
    } catch { /* ignore */ }
    cache = null;
  }

  return {
    getStars,
    starsForScore,
    bestScore,
    recordLevel,
    starsInSection,
    maxStarsInSection,
    completedLevelsInSection,
    isSectionComplete,
    isSectionUnlocked,
    totalStars,
    totalMaxStars,
    hasBadge,
    earnBadge,
    summary,
    resetAll,
  };
})();

// Expose for console debugging and automated testing.
window.Progression = Progression;
