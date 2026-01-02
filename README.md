# Githubstreak Backend

## Public API Contract (v1)

All endpoints are GET-only and CORS-open to any origin. Data may be cached by the server and proxies for up to 1 hour; user stats may also be served from a Mongo snapshot up to 60 minutes old.

### GET /v1/users/stat?id={clerkUserId}

- Purpose: Return the user’s recent contribution stats.
- Window: Only the last 7 calendar days (UTC-midnight bounded).
- Response: `{ username, avatar, highestStreak: { range, count }, currentStreak: { range, count }, totalContributions }`.
- Streak definition: `count = (endDate - startDate) in days` (non-inclusive), so one day of contributions yields `count = 0`; two consecutive days yields `count = 1`.
- Caching: Snapshot reuse up to 60 minutes; HTTP caching up to 1 hour.
- Errors: 400 if `id` missing; 500 otherwise.

### GET /v1/users/leaderboard

- Purpose: Rank up to 100 Clerk users by total contributions over the same 7-day window.
- Response items: `{ rank, username, avatar, contributions, currentStreak }` with ranks re-numbered after omitting users whose stats failed.
- Errors: 500 on failure.

### GET /v1/projects/contributors

- Purpose: Aggregate GitHub contributors across the hardcoded repos `Githubstreak/Githubstreak-frontend` and `Githubstreak/Githubstreak-backend`.
- Response items: `{ login, contributions, avatarUrl }` using only the first GitHub API page per repo.
- Errors: 500 on failure.

## Notes and Limits

- No HTTP authentication; any caller can request any `id`.
- Leaderboard scope is limited to the first 100 Clerk users; failed users are excluded without gaps in rank numbers.
- Contributor totals exclude additional pages beyond the GitHub API default page size.
- Time zones: contribution days are truncated to UTC midnight when computing the 7-day window.
