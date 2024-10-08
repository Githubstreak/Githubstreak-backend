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
export const fetchUserStats = async (userId) => {
  const provider = "oauth_github";

  const db = Database.getInstance();

  const snapshot = await db.getSnapshot(userId);

  if (snapshot) {
    const updatedAt = new Date(snapshot.updatedAt);
    const now = new Date();

    // Get time difference in minutes from milliseconds
    const timeDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60);

    console.log("Time diff ", timeDiff);

    if (timeDiff < cacheTime.MAX_SNAPSHOT_TIME) return snapshot;
  }

  const response = await clerkClient.users.getUserOauthAccessToken(
    userId,
    provider,
  );

  const token = response.data[0].token;

  const octokit = new Octokit({ auth: token });

  let currentStreakStart = "";
  let currentStreakEnd = "";

  let totalContributions = 0;

  let highestStreak = {
    range: `${currentStreakStart}-${currentStreakEnd}`,
    count: 0,
  };

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

  for (let week of contributionCalendar.weeks) {
    const contributionDays = week.contributionDays;

    for (let i = 0; i < contributionDays.length; i++) {
      const { contributionCount, date } = contributionDays[i];

      if (currentStreakStart === "") currentStreakStart = date;
      if (currentStreakEnd === "") currentStreakEnd = date;

      if (contributionCount > 0) {
        totalContributions += contributionCount;

        const dateDiff = getDateDiff(currentStreakEnd, date);

        if (dateDiff === 0 || dateDiff === 1) {
          currentStreakEnd = date;
        } else {
          currentStreakStart = date;
          currentStreakEnd = date;
        }
      }

      const streakCount = getDateDiff(currentStreakStart, currentStreakEnd);

      if (streakCount > highestStreak.count) {
        highestStreak = {
          range: `${currentStreakStart}-${currentStreakEnd}`,
          count: streakCount,
        };
      }
    }
  }

  const currentStreak = {
    range: `${currentStreakStart}-${currentStreakEnd}`,
    count: getDateDiff(currentStreakStart, currentStreakEnd),
  };

  const newSnapshot = {
    username: login,
    avatar: avatarUrl,
    highestStreak,
    currentStreak,
    totalContributions,
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
    fetchUserStats(user.id),
  );

  const usersStats = await Promise.allSettled(usersStatsPromise);

  usersStats
    .filter((promise) => promise.status === "rejected")
    .forEach((promise) => console.log(promise.reason));

  const leaderboard = usersStats
    .filter((promise) => promise.status === "fulfilled")
    .sort((a, b) => b.value.totalContributions - a.value.totalContributions)
    .map((promise, rank) => ({
      rank: rank + 1,
      username: promise.value.username,
      avatar: promise.value.avatar,
      contributions: promise.value.totalContributions,
      currentStreak: promise.value.currentStreak,
    }));

  return leaderboard;
};
