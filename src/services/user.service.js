import { createClerkClient } from "@clerk/clerk-sdk-node";
import { Octokit } from "octokit";
import { getDateDiff, fmtDateAsIso } from "../utils/index.js";
import { Database } from "../lib/database.js";
import { cacheTime } from "../utils/constants.js";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Retrieves the total contributions, highest and current streak of the user
 * @param {string} userId - The id of the user provided by clerk
 * */
export const fetchUserStats = async (userId, { refresh = false } = {}) => {
  const provider = "oauth_github";

  const db = Database.getInstance();

  const snapshot = await db.getSnapshot(userId);

  const hasNewShape =
    snapshot &&
    snapshot.contributions !== undefined &&
    snapshot.currentStreak?.count !== undefined &&
    snapshot.longestStreak?.count !== undefined &&
    Object.prototype.hasOwnProperty.call(snapshot, "lastContributionDate") &&
    Array.isArray(snapshot.contributionDays);

  if (snapshot && hasNewShape && !refresh) {
    const updatedAt = new Date(snapshot.updatedAt);
    const now = new Date();

    // Get time difference in minutes from milliseconds
    const timeDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60);

    if (timeDiff < cacheTime.MAX_SNAPSHOT_TIME) return snapshot;
  }

  const response = await clerkClient.users.getUserOauthAccessToken(
    userId,
    provider
  );

  const token = response.data[0].token;

  const octokit = new Octokit({ auth: token });

  let currentStreakCount = 0;
  let longestStreakCount = 0;
  let currentStreakStart = null;
  let currentStreakEnd = null;

  let totalContributions = 0;
  let lastContributionDate = null;
  let contributionDays = [];

  const today = new Date();
  const last7Days = new Date(today);
  last7Days.setDate(today.getDate() - 7);

  const start = fmtDateAsIso(last7Days.toString());
  const end = fmtDateAsIso(today.toString());

  const contributions = await octokit.graphql(`
    query {
        viewer {
            login
            avatarUrl
            createdAt
            contributionsCollection(from: "${start}", to: "${end}") {
                contributionCalendar {
                    weeks {
                        contributionDays {
                            contributionCount
                            date
                        }
                    }
                }
            }
        }
    }
`);

  const { contributionsCollection, login, avatarUrl } = contributions.viewer;

  const { contributionCalendar } = contributionsCollection;

  const allContributionDays = contributionCalendar.weeks.flatMap(
    (week) => week.contributionDays
  );

  for (let i = 0; i < allContributionDays.length; i++) {
    const { contributionCount, date } = allContributionDays[i];

    if (contributionCount > 0) {
      totalContributions += contributionCount;
      contributionDays.push(date);

      if (!lastContributionDate || date > lastContributionDate) {
        lastContributionDate = date;
      }
    }
  }

  contributionDays = contributionDays
    .sort((a, b) => b.localeCompare(a))
    .filter((value, index, self) => index === self.indexOf(value));

  const sortedForStreak = [...contributionDays].sort((a, b) =>
    a.localeCompare(b)
  );

  let longestStart = null;
  let longestEnd = null;

  for (let i = 0; i < sortedForStreak.length; i++) {
    const date = sortedForStreak[i];

    if (i === 0) {
      currentStreakStart = date;
      currentStreakEnd = date;
      currentStreakCount = 1;
    } else {
      const prevDate = sortedForStreak[i - 1];
      const diffFromPrev = getDateDiff(prevDate, date);

      if (diffFromPrev === 1) {
        currentStreakCount += 1;
        currentStreakEnd = date;
      } else {
        currentStreakStart = date;
        currentStreakEnd = date;
        currentStreakCount = 1;
      }
    }

    if (currentStreakCount > longestStreakCount) {
      longestStreakCount = currentStreakCount;
      longestStart = currentStreakStart;
      longestEnd = currentStreakEnd;
    }
  }

  const newSnapshot = {
    username: login,
    avatar: avatarUrl,
    currentStreak: {
      count: currentStreakCount,
      startDate: currentStreakStart
        ? new Date(currentStreakStart).toISOString()
        : null,
    },
    longestStreak: {
      count: longestStreakCount,
      startDate: longestStart ? new Date(longestStart).toISOString() : null,
      endDate: longestEnd ? new Date(longestEnd).toISOString() : null,
    },
    contributions: totalContributions,
    lastContributionDate: lastContributionDate
      ? new Date(lastContributionDate).toISOString()
      : null,
    contributionDays,
  };

  await db.saveSnapshot(userId, newSnapshot);

  return newSnapshot;
};

/**
 * Get users a sorted leaderboard
 * based on users contributions
 * */
export const fetchLeaderboard = async () => {
  const usersList = await clerkClient.users.getUserList({ limit: 100 });

  const usersStatsPromise = usersList.data.map((user) =>
    fetchUserStats(user.id)
  );

  const usersStats = await Promise.allSettled(usersStatsPromise);

  usersStats
    .filter((promise) => promise.status === "rejected")
    .forEach((promise) => console.log(promise.reason));

  const leaderboard = usersStats
    .filter((promise) => promise.status === "fulfilled")
    .sort((a, b) => b.value.contributions - a.value.contributions)
    .map((promise, rank) => ({
      rank: rank + 1,
      username: promise.value.username,
      avatar: promise.value.avatar,
      contributions: promise.value.contributions,
      currentStreak: promise.value.currentStreak,
    }));

  return leaderboard;
};
