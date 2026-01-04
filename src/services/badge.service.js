import { Database } from "../lib/database.js";

/**
 * Get streak color based on count
 * @param {number} count - Streak count
 * @returns {string} Hex color
 */
const getStreakColor = (count) => {
  if (count === 0) return "#6b7280"; // Gray
  if (count < 7) return "#3b82f6"; // Blue
  if (count < 30) return "#22c55e"; // Green
  if (count < 100) return "#eab308"; // Gold
  return "#a855f7"; // Purple
};

/**
 * Generate SVG badge for a user's streak
 * @param {string} username - GitHub username
 * @param {object} options - Badge options
 * @param {string} options.style - Badge style: flat, plastic, for-the-badge
 * @param {string} options.theme - Color theme: dark, light
 * @returns {Promise<string>} SVG string
 */
export const generateBadge = async (
  username,
  { style = "flat", theme = "dark" } = {}
) => {
  const db = Database.getInstance();
  const snapshot = await db.getSnapshotByUsername(username);

  const streakCount = snapshot?.currentStreak?.count ?? 0;
  const streakColor = getStreakColor(streakCount);
  const dayText = streakCount === 1 ? "day" : "days";

  const bgColor = theme === "light" ? "#ffffff" : "#1e293b";
  const textColor = theme === "light" ? "#1e293b" : "#ffffff";
  const borderColor = theme === "light" ? "#e2e8f0" : "none";

  let height = 28;
  let fontSize = 12;
  let rx = 3;

  if (style === "plastic") {
    rx = 4;
  } else if (style === "for-the-badge") {
    height = 32;
    fontSize = 11;
    rx = 0;
  }

  const textWidth = `${streakCount} ${dayText} streak`.length * 7;
  const width = 40 + textWidth;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${
    borderColor !== "none"
      ? `<rect width="${width}" height="${height}" rx="${rx}" fill="${bgColor}" stroke="${borderColor}" stroke-width="1"/>`
      : `<rect width="${width}" height="${height}" rx="${rx}" fill="${bgColor}"/>`
  }
  <text x="10" y="${height / 2 + 5}" font-size="14">🔥</text>
  <text x="32" y="${
    height / 2 + 4
  }" font-family="Segoe UI, sans-serif" font-size="${fontSize}" fill="${textColor}">
    <tspan font-weight="bold" fill="${streakColor}">${streakCount}</tspan> ${dayText} streak
  </text>
</svg>`;

  return svg;
};
