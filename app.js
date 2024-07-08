import express from "express";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import { Octokit } from "octokit";
import cors from "cors";
import "dotenv/config";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET"],
  }),
);

const port = process.env.PORT || 3001;

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const getDateDiff = (start, end) =>
  (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);

app.get("/", async (req, res) => {
  const { id: userId } = req.query;

  if (!userId) {
    res.status(400).json({ error: "Id of the user is required" });
    return;
  }

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
  dateJoined.setHours(0);
  dateJoined.setMinutes(0);
  dateJoined.setSeconds(0);

  const today = new Date();
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);

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
    const start = new Date(year, 0, 1);
    start.setHours(0);
    start.setMinutes(0);
    start.setSeconds(0);

    const end = new Date(year, 11, 31);
    end.setHours(23);
    end.setMinutes(59);
    end.setSeconds(59);

    const contributions = await octokit.graphql(`
    query {
        user(login: "${login}") {
            createdAt
            contributionsCollection(from: "${start.toISOString()}", to: "${end.toISOString()}") {
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

  res.json({
    highestStreak,
    currentStreak,
    totalContributions,
  });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
