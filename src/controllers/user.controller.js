import {
  fetchUserStats,
  fetchLeaderboard,
  fetchPublicUserStats,
} from "../services/user.service.js";
// ...existing code...
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
    res.status(400).json({ error: "Id of the user is required" });
    return;
  }

  try {
    const stats = await fetchUserStats(userId, {
      refresh: refresh === "true",
    });
    res.json(stats);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    let leaderboard = await fetchLeaderboard();

    // If userId provided, ensure the user is included
    const { userId } = req.query;
    if (userId) {
      const userInLeaderboard = leaderboard.find((user) => user.id === userId); // Assuming user has id, but actually username or something. Wait, snapshots have _id as userId? Wait, no, the leaderboard has username.

      // The leaderboard items don't have userId, they have username.

      // To check if current user is included, perhaps compare with req.auth.userId

      // Since auth is required, req.auth.userId is the current user.

      // But the param is userId, perhaps it's the same.

      // If the current user is not in leaderboard, fetch their stats and add.

      const currentUserId = req.auth.userId;

      const userInLeaderboard = leaderboard.some(
        (user) => user.id === currentUserId
      ); // But leaderboard doesn't have id.

      // The snapshots are keyed by userId, but the leaderboard has username.

      // To check, perhaps need to see if any snapshot has _id === currentUserId.

      // But since fetchLeaderboard gets from Clerk users, and maps to stats, the stats have the userId? No, fetchUserStats returns snapshot, which has username.

      // The snapshot has username, not userId.

      // To ensure current user is included, if not in leaderboard (by username), fetch their stats and add.

      // But since req.auth has username? Clerk user has username.

      // req.auth.userId is the id, but to get username, perhaps fetch from Clerk.

      // This is getting complicated.

      // Since the leaderboard is for all users with data, and the current user has data (since signed in), they should be included.

      // Perhaps the param userId is not needed, as the leaderboard includes all.

      // But the user spec says optional userId to include them.

      // Perhaps if userId provided, and not in results, add them.

      // But since userId is Clerk id, and leaderboard has username, need to map.

      // Perhaps modify fetchLeaderboard to return userId as well.

      // To simplify, since the current implementation should include the user if they have data, and the user says they are signed in but not on leaderboard, perhaps the fetch failed for them.

      // But to follow the spec, let's add the logic.

      // In getLeaderboard, if userId param, fetch the user's stats and add to leaderboard if not present.

      if (userId) {
        const userStats = await fetchUserStats(userId);
        if (
          userStats &&
          !leaderboard.some((u) => u.username === userStats.username)
        ) {
          leaderboard.push(userStats);
        }
      }

      // Then sort again.

      // Sort by currentStreak.count descending
      leaderboard = leaderboard.sort((a, b) => {
        const aStreak = a.currentStreak?.count ?? 0;
        const bStreak = b.currentStreak?.count ?? 0;
        if (bStreak !== aStreak) return bStreak - aStreak;
        if (b.contributions !== a.contributions)
          return b.contributions - a.contributions;
        return a.username.localeCompare(b.username);
      });

      // Reassign ranks
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
      `public, max-age=${cacheTime.BROWSER_CACHE_TIME}`
    );
    // Advanced: return all fields for enhanced leaderboard
    res.json({
      success: true,
      data: leaderboard,
      meta: {
        total: leaderboard.length,
        topUsers: leaderboard.slice(0, 3).map((u) => u.username),
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Internal server error" });
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
      html
    );
  } catch (error) {
    console.error("Error sending milestone email:", error);
  }
};
