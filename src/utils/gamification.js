// ============================================
// Gamification Engine — Streaks, XP, Levels
// ============================================

const GAME_KEY = 'focusflow_game';

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600,
  6000, 7700, 9700, 12000, 15000, 18500, 22500, 27000, 32000, 38000
];

const LEVEL_TITLES = [
  'Beginner', 'Apprentice', 'Focused', 'Dedicated', 'Consistent',
  'Driven', 'Determined', 'Disciplined', 'Masterful', 'Elite',
  'Champion', 'Legend', 'Prodigy', 'Virtuoso', 'Sage',
  'Grandmaster', 'Transcendent', 'Ascended', 'Mythic', 'Immortal'
];

const getDefaultState = () => ({
  xp: 0,
  streak: 0,
  lastActiveDate: null,
  focusHistory: [],      // [{ date: 'YYYY-MM-DD', minutes: 0, sessions: 0 }]
  totalSessions: 0,
  totalMinutes: 0,
  longestStreak: 0,
  achievements: [],
});

export const loadGameState = () => {
  try {
    const saved = localStorage.getItem(GAME_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...getDefaultState(), ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load game state', e);
  }
  return getDefaultState();
};

export const saveGameState = (state) => {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game state', e);
  }
};

export const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getLevelInfo = (xp) => {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  const currentThreshold = LEVEL_THRESHOLDS[level] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level + 1] || LEVEL_THRESHOLDS[level] + 5000;
  const xpInLevel = xp - currentThreshold;
  const xpForNextLevel = nextThreshold - currentThreshold;
  const progress = xpForNextLevel > 0 ? (xpInLevel / xpForNextLevel) * 100 : 100;

  return {
    level: level + 1,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)],
    xp,
    xpInLevel,
    xpForNextLevel,
    progress: Math.min(progress, 100),
    nextThreshold,
  };
};

/**
 * Called when a focus session completes.
 * @param {number} minutes - Duration of the completed session
 * @returns {{ xpGained, newStreak, leveledUp, newState }}
 */
export const completeFocusSession = (minutes) => {
  const state = loadGameState();
  const today = getToday();
  const yesterday = getYesterday();

  // Calculate streak
  let newStreak = state.streak;
  if (state.lastActiveDate === today) {
    // Already active today, streak stays
  } else if (state.lastActiveDate === yesterday) {
    // Continuing streak
    newStreak = state.streak + 1;
  } else if (state.lastActiveDate === null) {
    // First ever session
    newStreak = 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  // XP calculation
  const baseXP = Math.round(minutes * 1); // 1 XP per minute
  const streakBonus = Math.min(newStreak, 10) * 2; // up to 20 bonus XP for 10-day streak
  const xpGained = baseXP + streakBonus;

  const oldLevel = getLevelInfo(state.xp).level;

  // Update focus history
  const existingEntry = state.focusHistory.find(h => h.date === today);
  if (existingEntry) {
    existingEntry.minutes += minutes;
    existingEntry.sessions += 1;
  } else {
    state.focusHistory.push({ date: today, minutes, sessions: 1 });
  }

  // Keep only last 90 days of history
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  state.focusHistory = state.focusHistory.filter(h => h.date >= cutoffStr);

  // Update state
  state.xp += xpGained;
  state.streak = newStreak;
  state.lastActiveDate = today;
  state.totalSessions += 1;
  state.totalMinutes += minutes;
  state.longestStreak = Math.max(state.longestStreak, newStreak);

  const newLevel = getLevelInfo(state.xp).level;
  const leveledUp = newLevel > oldLevel;

  saveGameState(state);

  return { xpGained, streakBonus, newStreak, leveledUp, newState: state };
};

/**
 * Checks and updates streak status (call on app load).
 * If the user missed yesterday, streak resets.
 */
export const checkStreakStatus = () => {
  const state = loadGameState();
  const today = getToday();
  const yesterday = getYesterday();

  if (state.lastActiveDate && state.lastActiveDate !== today && state.lastActiveDate !== yesterday) {
    // Streak is broken
    state.streak = 0;
    saveGameState(state);
  }

  return state;
};

/**
 * Get today's focus stats
 */
export const getTodayStats = () => {
  const state = loadGameState();
  const today = getToday();
  const entry = state.focusHistory.find(h => h.date === today);
  return {
    minutes: entry?.minutes || 0,
    sessions: entry?.sessions || 0,
  };
};

/**
 * Get focus history for the last N days
 */
export const getRecentHistory = (days = 7) => {
  const state = loadGameState();
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const entry = state.focusHistory.find(h => h.date === dateStr);
    result.push({
      date: dateStr,
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      minutes: entry?.minutes || 0,
      sessions: entry?.sessions || 0,
    });
  }

  return result;
};
