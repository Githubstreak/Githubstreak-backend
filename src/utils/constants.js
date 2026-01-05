export const cacheTime = {
  MAX_SNAPSHOT_TIME: 60, // Minutes
  API_CACHE_TIME: "1 hour",
  BROWSER_CACHE_TIME: "3600", // Seconds
};

export const communityProjects = [
  "Githubstreak-frontend",
  "Githubstreak-backend",
];

export const PLEDGE_TEMPLATES = {
  "7-day": {
    name: "Week Warrior",
    days: 7,
    reward: "Week Warrior badge",
    xpBonus: 100,
  },
  "30-day": {
    name: "Monthly Master",
    days: 30,
    reward: "Monthly Master badge + Freeze Token",
    xpBonus: 500,
  },
  "100-day": {
    name: "Century Legend",
    days: 100,
    reward: "Century badge + Profile flair",
    xpBonus: 2000,
  },
  "365-day": {
    name: "Yearly Champion",
    days: 365,
    reward: "Yearly Champion title + All badges",
    xpBonus: 10000,
  },
};

export const SQUAD_LIMITS = {
  MAX_MEMBERS: 10,
  CODE_LENGTH: 6,
  MAX_NAME_LENGTH: 30,
};

export const STREAK_TIERS = {
  STARTER: { min: 0, max: 6, name: "Starter", color: "#6b7280" },
  RISING: { min: 7, max: 29, name: "Rising", color: "#3b82f6" },
  WARRIOR: { min: 30, max: 99, name: "Warrior", color: "#22c55e" },
  MASTER: { min: 100, max: 364, name: "Master", color: "#eab308" },
  LEGENDARY: { min: 365, max: Infinity, name: "Legendary", color: "#a855f7" },
};

export const getStreakTier = (streakCount) => {
  if (streakCount >= 365) return STREAK_TIERS.LEGENDARY;
  if (streakCount >= 100) return STREAK_TIERS.MASTER;
  if (streakCount >= 30) return STREAK_TIERS.WARRIOR;
  if (streakCount >= 7) return STREAK_TIERS.RISING;
  return STREAK_TIERS.STARTER;
};
