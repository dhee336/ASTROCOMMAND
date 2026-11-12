/**
 * storage.js — Local Storage persistence for ASTRO COMMAND.
 * Saves the active mission state, a resume flag, and long-term best scores.
 */
const Storage = (() => {
  "use strict";

  const SAVE_KEY = "astro-command-save-v1";
  const STATS_KEY = "astro-command-stats-v1";

  /** Save the active mission state (called after every action/day). */
  function saveMission(state) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("ASTRO COMMAND: could not save mission.", err);
    }
  }

  /** Load the saved mission, or null if none / unreadable. */
  function loadMission() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      return (state && state.status === "active") ? state : null;
    } catch (err) {
      console.warn("ASTRO COMMAND: saved mission is unreadable.", err);
      return null;
    }
  }

  /** Remove the saved mission (used when a mission ends or is discarded). */
  function clearMission() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (err) {
      console.warn("ASTRO COMMAND: could not clear save.", err);
    }
  }

  /** Long-term stats: completed missions count and best score. */
  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY)) || { completed: 0, bestScore: 0 };
    } catch {
      return { completed: 0, bestScore: 0 };
    }
  }

  function recordMissionResult(score) {
    const stats = loadStats();
    stats.completed += 1;
    if (score > stats.bestScore) stats.bestScore = score;
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (err) {
      console.warn("ASTRO COMMAND: could not save stats.", err);
    }
    return stats;
  }

  /** Full reset of all game progress. */
  function clearAll() {
    clearMission();
    try {
      localStorage.removeItem(STATS_KEY);
    } catch (err) { /* ignore */ }
  }

  return { saveMission, loadMission, clearMission, loadStats, recordMissionResult, clearAll };
})();
