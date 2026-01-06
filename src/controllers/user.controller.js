<<<<<<< HEAD
  fetchUserStats,
  fetchLeaderboard,
  fetchPublicUserStats,
} from "../services/user.service.js";
=======
>>>>>>> b2c1e2581521375f395141c8bfb98aa45a804821
import {
  fetchUserStats,
  fetchLeaderboard,
  fetchPublicUserStats,
} from "../services/user.service.js";
<<<<<<< HEAD
import { sendMilestoneEmail } from "../utils/sendgrid.js";
/**
 * Send milestone email to user when they achieve a milestone
 * Call this function after updating user stats or milestones
 */
export const sendUserMilestoneEmail = async (userEmail, milestone, stats) => {
  const subject = `Githubstreak: You’ve unlocked a new milestone!`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7f9fa; padding: 32px; border-radius: 12px; max-width: 600px; margin: auto;">
      <div style="text-align: center;">
        <img src='https://githubstreak.com/logo.png' alt='Githubstreak Logo' style='width: 80px; margin-bottom: 16px;' />
        <h1 style="color: #2d3748;">Congratulations!</h1>
        <h2 style="color: #3182ce;">${milestone} Achieved</h2>
      </div>
      <p style="font-size: 1.1em; color: #4a5568;">Hi Githubstreaker,</p>
      <p style="font-size: 1.1em; color: #4a5568;">You’ve just reached the <strong>${milestone}</strong> milestone on <span style="color: #3182ce; font-weight: bold;">Githubstreak</span>! Your dedication and consistency are inspiring.</p>
      <div style="background: #e2e8f0; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <h3 style="color: #2d3748; margin-bottom: 8px;">Your Progress Snapshot</h3>
        <ul style="list-style: none; padding: 0; color: #2d3748;">
          <li><strong>Current Streak:</strong> ${stats.currentStreak?.count ?? 0} days</li>
          <li><strong>Longest Streak:</strong> ${stats.longestStreak?.count ?? 0} days</li>
          <li><strong>Total Contributions:</strong> ${stats.contributions ?? 0}</li>
        </ul>
      </div>
      <p style="font-size: 1.1em; color: #4a5568;">Share your achievement with your squad, inspire others, and keep pushing your limits. Every day counts!</p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://githubstreak.com/hall-of-fame" style="background: #3182ce; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">View Hall of Fame</a>
      </div>
      <p style="margin-top: 32px; color: #718096; font-size: 0.95em; text-align: center;">Thank you for being part of the Githubstreak community.<br />— The Githubstreak Team</p>
    </div>
  `;
  try {
    await sendMilestoneEmail(userEmail, subject, html);
  } catch (err) {
    console.error('Error sending milestone email:', err);
  }
};
=======
>>>>>>> b2c1e2581521375f395141c8bfb98aa45a804821
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

export const getLeaderboard = async (_, res) => {
  try {
    const leaderboard = await fetchLeaderboard();
    res.setHeader(
      "Cache-Control",
      `public, max-age=${cacheTime.BROWSER_CACHE_TIME}`
    );
    res.json(leaderboard);
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
