import { createClerkClient } from "@clerk/clerk-sdk-node";
import { Octokit } from "octokit";
import { getDateDiff, fmtDateAsIso } from "../utils/index.js";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Retrieves the total contributions, highest and current streak of the user
 * @param {string} userId - The id of the user provided by clerk
 * */
export const fetchUserStats = async (userId) => {
  const provider = "oauth_github";

  const response = await clerkClient.users.getUserOauthAccessToken(
    userId,
    provider,
  );

  const token = response.data[0].token;

  const octokit = new Octokit({ auth: token });

  const {
    data: { login },
  } = await octokit.rest.users.getAuthenticated();

  const currentYear = new Date().getFullYear();

  let currentStreakStart = "";
  let currentStreakEnd = "";

  let totalContributions = 0;

  let highestStreak = {
    range: `${currentStreakStart}-${currentStreakEnd}`,
    count: 0,
  };

  const start = fmtDateAsIso(`${currentYear}-01-01`);
  const end = fmtDateAsIso(`${currentYear}-12-31`);

  const contributions = await octokit.graphql(`
    query {
        user(login: "${login}") {
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

  const { contributionCalendar } = contributions.user.contributionsCollection;

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

  return {
    username: login,
    highestStreak,
    currentStreak,
    totalContributions,
  };
};

/**
 * Get users a sorted leaderboard
 * based on users contributions
 * */
export const fetchLeaderboard = async () => {
  const usersList = await clerkClient.users.getUserList();

  const usersStatsPromise = usersList.data.map((user) =>
    fetchUserStats(user.id),
  );

  const usersStats = await Promise.all(usersStatsPromise);

  const leaderboard = usersStats
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .map((user, rank) => ({
      rank: rank + 1,
      username: user.username,
      contributions: user.totalContributions,
      currentStreak: user.currentStreak,
    }));

  return leaderboard;
};
