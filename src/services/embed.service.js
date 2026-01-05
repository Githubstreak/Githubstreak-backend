import { Database } from "../lib/database.js";
import { getStreakTier } from "../utils/constants.js";

/**
 * SVG Theme configurations
 */
const THEMES = {
  dark: {
    bg: "#1e293b",
    bgGradient: ["#1e293b", "#0f172a"],
    text: "#ffffff",
    secondary: "#94a3b8",
    accent: "#f97316",
  },
  midnight: {
    bg: "#0a0a1a",
    bgGradient: ["#0a0a1a", "#1a1a3e"],
    text: "#e2e8f0",
    secondary: "#64748b",
    accent: "#8b5cf6",
  },
  fire: {
    bg: "#1c1917",
    bgGradient: ["#1c1917", "#451a03"],
    text: "#ffffff",
    secondary: "#a8a29e",
    accent: "#ef4444",
  },
  ocean: {
    bg: "#0c4a6e",
    bgGradient: ["#0c4a6e", "#075985"],
    text: "#f0f9ff",
    secondary: "#7dd3fc",
    accent: "#06b6d4",
  },
  forest: {
    bg: "#14532d",
    bgGradient: ["#14532d", "#166534"],
    text: "#f0fdf4",
    secondary: "#86efac",
    accent: "#22c55e",
  },
};

/**
 * Generate embeddable SVG profile card
 */
export const generateProfileCard = async (username, theme = "dark") => {
  const db = Database.getInstance();
  const snapshot = await db.getSnapshotByUsername(username);

  const streakCount = snapshot?.currentStreak?.count ?? 0;
  const contributions = snapshot?.contributions ?? 0;
  const avatar = snapshot?.avatar ?? "";
  const tier = getStreakTier(streakCount);

  const colors = THEMES[theme] || THEMES.dark;

  const svg = `<svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${
        colors.bgGradient[0]
      };stop-opacity:1" />
      <stop offset="100%" style="stop-color:${
        colors.bgGradient[1]
      };stop-opacity:1" />
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="50" cy="60" r="35"/>
    </clipPath>
  </defs>
  
  <!-- Background -->
  <rect width="400" height="120" rx="12" fill="url(#bgGrad)"/>
  
  <!-- Avatar -->
  ${
    avatar
      ? `<image href="${avatar}" x="15" y="25" width="70" height="70" clip-path="url(#avatarClip)"/>`
      : `<circle cx="50" cy="60" r="35" fill="${colors.secondary}"/>`
  }
  <circle cx="50" cy="60" r="35" fill="none" stroke="${
    tier.color
  }" stroke-width="3"/>
  
  <!-- Username -->
  <text x="100" y="40" font-family="Segoe UI, sans-serif" font-size="18" font-weight="bold" fill="${
    colors.text
  }">
    ${username}
  </text>
  
  <!-- Tier Badge -->
  <rect x="100" y="48" width="${
    tier.name.length * 8 + 16
  }" height="20" rx="4" fill="${tier.color}"/>
  <text x="108" y="62" font-family="Segoe UI, sans-serif" font-size="11" font-weight="600" fill="#fff">
    ${tier.name}
  </text>
  
  <!-- Streak -->
  <text x="100" y="90" font-family="Segoe UI, sans-serif" font-size="14" fill="${
    colors.secondary
  }">
    🔥 <tspan font-weight="bold" fill="${
      colors.accent
    }">${streakCount}</tspan> day streak
  </text>
  
  <!-- Contributions -->
  <text x="240" y="90" font-family="Segoe UI, sans-serif" font-size="14" fill="${
    colors.secondary
  }">
    📊 <tspan font-weight="bold" fill="${
      colors.text
    }">${contributions.toLocaleString()}</tspan> contributions
  </text>
  
  <!-- Branding -->
  <text x="320" y="110" font-family="Segoe UI, sans-serif" font-size="10" fill="${
    colors.secondary
  }" opacity="0.7">
    GitHubStreak
  </text>
</svg>`;

  return svg;
};

/**
 * Get public profile data
 */
export const getPublicProfile = async (username) => {
  const db = Database.getInstance();
  const snapshot = await db.getSnapshotByUsername(username);

  if (!snapshot) {
    return null;
  }

  const tier = getStreakTier(snapshot.currentStreak?.count ?? 0);

  // Calculate rank from leaderboard position
  const allSnapshots = await db.conn
    .collection("snapshots")
    .find({})
    .sort({ contributions: -1 })
    .toArray();

  const rank = allSnapshots.findIndex((s) => s.username === username) + 1;

  return {
    username: snapshot.username,
    avatar: snapshot.avatar,
    currentStreak: snapshot.currentStreak?.count ?? 0,
    longestStreak: snapshot.longestStreak?.count ?? 0,
    contributions: snapshot.contributions ?? 0,
    tier: tier.name,
    rank: rank || null,
  };
};
