import { createClerkClient } from "@clerk/clerk-sdk-node";
import { Octokit } from "octokit";
import { getDateDiff, fmtDateAsIso } from "../utils/index.js";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Retrieves the total contributions, highest and current streak of the user
 * @param {string} userId - The id of the user provided by clerk
 * @returns {Promise<{
 * totalContributions: number
 * highestStreak: {range: string; count: number}
 * currentStreak: {range: string; count: number}
 * }>} Stats of the user
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
    data: { login, created_at },
  } = await octokit.rest.users.getAuthenticated();

  const dateJoined = new Date(created_at);

  const today = new Date();

  const firstYearOnGh = dateJoined.getFullYear();

  const yearsOnGh = new Array(today.getFullYear() - firstYearOnGh + 1) // Include first year in count
    .fill(firstYearOnGh - 1) // Start all indexes with one year before the first year
    .map((year, index) => year + index + 1); // Account for 0 index

  let currentStreakStart = "";
  let currentStreakEnd = "";

  let totalContributions = 0;

  let highestStreak = {
    range: `${currentStreakStart}-${currentStreakEnd}`,
    count: 0,
  };

  for (let year of yearsOnGh) {
    const start = fmtDateAsIso(`${year}-01-01`);
    const end = fmtDateAsIso(`${year}-12-31`);

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
  }

  const currentStreak = {
    range: `${currentStreakStart}-${currentStreakEnd}`,
    count: getDateDiff(currentStreakStart, currentStreakEnd),
  };

  return {
    highestStreak,
    currentStreak,
    totalContributions,
  };
};
