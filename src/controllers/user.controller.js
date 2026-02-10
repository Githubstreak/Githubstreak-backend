import {
  fetchUserStats,
  fetchLeaderboard,
  fetchPublicUserStats,
} from "../services/user.service.js";
import { cacheTime } from "../utils/constants.js";
import { Database } from "../lib/database.js";

/**
 * Calculate earned freezes based on longest streak
 */
const calculateEarnedFreezes = (longestStreak) => {
  if (longestStreak >= 100) return 6; // 1 + 2 + 3
  if (longestStreak >= 30) return 3; // 1 + 2
  if (longestStreak >= 7) return 1;
  return 0;
};

export const getUserStats = async (req, res) => {
  const userId = req.auth?.userId || req.query.id;
  const { refresh } = req.query;

  if (!userId) {
    res.status(400).json({
      success: false,
      error: "MISSING_USER_ID",
      message: "Id of the user is required",
    });
    return;
  }

  try {
    const stats = await fetchUserStats(userId, {
      refresh: refresh === "true",
    });
    res.json({ success: true, data: stats });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    let leaderboard = await fetchLeaderboard();

    const { userId } = req.query;
    if (userId) {
      const userStats = await fetchUserStats(userId);
      if (
        userStats &&
        !leaderboard.some((u) => u.username === userStats.username)
      ) {
        leaderboard.push(userStats);
      }

      leaderboard = leaderboard.sort((a, b) => {
        const aStreak = a.currentStreak?.count ?? 0;
        const bStreak = b.currentStreak?.count ?? 0;
        if (bStreak !== aStreak) return bStreak - aStreak;
        if (b.contributions !== a.contributions)
          return b.contributions - a.contributions;
        return a.username.localeCompare(b.username);
      });

      function getTier(streak) {
        if (streak >= 100) return { label: "Legendary", emoji: "🏆" };
        if (streak >= 30) return { label: "Master", emoji: "🥇" };
        if (streak >= 7) return { label: "Warrior", emoji: "🔥" };
        return { label: "Starter", emoji: "🌱" };
      }

      leaderboard = leaderboard.map((user, idx) => {
        const tier = getTier(user.currentStreak?.count ?? 0);
        return {
          rank: idx + 1,
          username: user.username,
          avatar: user.avatar,
          contributions: user.contributions,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          tier: tier.label,
          rankEmoji: tier.emoji,
          monthlyStats: user.monthlyStats,
          weeklyStats: user.weeklyStats,
          lastContributionDate: user.lastContributionDate,
          highlight: idx < 3 ? "top" : undefined,
        };
      });
    }

    res.setHeader(
      "Cache-Control",
      `public, max-age=${cacheTime.BROWSER_CACHE_TIME}`,
    );
    res.json({
      success: true,
      data: leaderboard,
      meta: {
        total: leaderboard.length,
        topUsers: leaderboard.slice(0, 3).map((u) => u.username),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

export const useFreeze = async (req, res) => {
  const userId = req.auth?.userId || req.body.userId;

  if (!userId) {
    res.status(400).json({
      success: false,
      error: "MISSING_USER_ID",
      message: "userId is required",
    });
    return;
  }

  try {
    const db = Database.getInstance();

    // Get user's current stats to determine longest streak
    const snapshot = await db.getSnapshot(userId);

    if (!snapshot) {
      res.status(404).json({
        success: false,
        error: "USER_NOT_FOUND",
        message: "User stats not found. Please sync your data first.",
      });
      return;
    }

    const longestStreak = snapshot.longestStreak?.count ?? 0;
    const earnedFreezes = calculateEarnedFreezes(longestStreak);

    // Get freeze usage
    const freezeData = await db.getUserFreeze(userId);
    const usedFreezes = freezeData.usedFreezes ?? 0;
    const availableFreezes = earnedFreezes - usedFreezes;

    if (availableFreezes <= 0) {
      res.status(400).json({
        success: false,
        error: "NO_FREEZES_AVAILABLE",
        message: "You don't have any streak freezes available",
      });
      return;
    }

    // Use the freeze
    await db.useFreeze(userId);

    res.json({
      success: true,
      message: "Streak freeze applied successfully",
      data: {
        usedFreezes: usedFreezes + 1,
        availableFreezes: availableFreezes - 1,
        currentStreak: snapshot.currentStreak?.count ?? 0,
        streakRestored: true,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

export const syncUser = async (req, res) => {
  const userId = req.auth?.userId || req.body.userId;

  if (!userId) {
    res.status(400).json({
      success: false,
      error: "MISSING_USER_ID",
      message: "userId is required",
    });
    return;
  }

  try {
    const db = Database.getInstance();

    // Check rate limit (5 minutes)
    const lastSync = await db.getLastSync(userId);

    if (lastSync) {
      const now = new Date();
      const timeDiff = (now.getTime() - lastSync.getTime()) / (1000 * 60);

      if (timeDiff < 5) {
        const waitTime = Math.ceil(5 - timeDiff);
        res.status(429).json({
          success: false,
          error: "RATE_LIMITED",
          message: `Please wait ${waitTime} minute(s) before syncing again`,
        });
        return;
      }
    }

    // Force refresh from GitHub
    const stats = await fetchUserStats(userId, { refresh: true });

    // Update last sync time
    await db.updateLastSync(userId);

    res.json({
      success: true,
      message: "Sync completed",
      data: {
        currentStreak: stats.currentStreak?.count ?? 0,
        contributions: stats.contributions,
        lastSyncedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

export const getPublicUserStats = async (req, res) => {
  const { username } = req.params;

  if (!username || typeof username !== "string" || username.trim() === "") {
    res.status(400).json({
      success: false,
      error: "INVALID_USERNAME",
      message: "Invalid username",
    });
    return;
  }

  try {
    const stats = await fetchPublicUserStats(username);

    if (!stats) {
      res.status(404).json({
        success: false,
        error: "USER_NOT_FOUND",
        message: "User not found or profile is private",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        username: stats.username,
        avatarUrl: stats.avatar,
        currentStreak: stats.currentStreak?.count ?? 0,
        longestStreak: stats.longestStreak?.count ?? 0,
        contributions: stats.contributions ?? 0,
        isPublic: true,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
};

/**
 * Send milestone email to user
 */
export const sendUserMilestoneEmail = async (email, milestone, stats) => {
  try {
    const { sendMilestoneEmail } = await import("../utils/sendgrid.js");
    const html = `
      <h1>Congratulations!</h1>
      <p>You've reached a ${milestone} milestone!</p>
      <p>Current streak: ${stats.currentStreak?.count || 0} days</p>
      <p>Keep it up!</p>
    `;
    await sendMilestoneEmail(
      email,
      `GitHub Streak Milestone: ${milestone}`,
      html,
    );
  } catch (error) {
    console.error("Error sending milestone email:", error);
  }
};
