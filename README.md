# Githubstreak Backend

## Public API Contract (v1)

Endpoints support GET, POST, and PATCH methods. CORS is open to any origin. Data may be cached by the server and proxies for up to 1 hour; user stats may also be served from a Mongo snapshot up to 60 minutes old.

---

### GET /v1/users/stat?id={clerkUserId}[&refresh=true]

- **Purpose:** Return the user's recent contribution stats for frontend streak display.
- **Window:** Only the last 7 calendar days (UTC-midnight bounded).
- **Response:**
  ```json
  {
    "username": "github-username",
    "avatar": "https://github.com/user.png",
    "currentStreak": { "count": 15, "startDate": "2025-12-20T00:00:00Z" },
    "longestStreak": {
      "count": 45,
      "startDate": "2025-10-01T00:00:00Z",
      "endDate": "2025-11-14T00:00:00Z"
    },
    "contributions": 1234,
    "lastContributionDate": "2026-01-04T00:00:00Z",
    "contributionDays": [
      { "date": "2026-01-04", "count": 5 },
      { "date": "2026-01-03", "count": 3 }
    ]
  }
  ```
- **Streak definition:** Counts are the number of consecutive contribution days (inclusive). A single contribution day yields `count = 1`.
- **Caching:** Snapshot reuse up to 60 minutes unless `refresh=true`, which forces a fresh GitHub fetch and snapshot update; HTTP caching up to 1 hour.
- **Errors:** 400 if `id` missing; 500 otherwise.

---

### POST /v1/users/sync

- **Purpose:** Manually trigger a GitHub data refresh.
- **Rate Limit:** 1 sync per user per 5 minutes.
- **Request Body:**
  ```json
  { "userId": "clerk_user_id" }
  ```
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "Sync completed",
    "data": {
      "currentStreak": 16,
      "contributions": 1235,
      "lastSyncedAt": "2026-01-04T15:30:00Z"
    }
  }
  ```
- **Errors:** 400 if `userId` missing; 429 if rate limited; 500 otherwise.

---

### POST /v1/users/use-freeze

- **Purpose:** Use a streak freeze token to preserve streak after missing a day.
- **Freeze Earning Rules:**
  - 7-day streak: +1 freeze
  - 30-day streak: +2 freezes (total 3)
  - 100-day streak: +3 freezes (total 6)
- **Request Body:**
  ```json
  { "userId": "clerk_user_id" }
  ```
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "Streak freeze applied successfully",
    "data": {
      "usedFreezes": 1,
      "availableFreezes": 2,
      "currentStreak": 15,
      "streakRestored": true
    }
  }
  ```
- **Response (Error - 400):**
  ```json
  {
    "success": false,
    "error": "NO_FREEZES_AVAILABLE",
    "message": "You don't have any streak freezes available"
  }
  ```

---

### GET /v1/users/public/:username

- **Purpose:** Lookup public stats for another user (for streak battles).
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "data": {
      "username": "octocat",
      "avatarUrl": "https://github.com/octocat.png",
      "currentStreak": 25,
      "longestStreak": 45,
      "contributions": 1234,
      "isPublic": true
    }
  }
  ```
- **Response (Not Found - 404):**
  ```json
  {
    "success": false,
    "error": "USER_NOT_FOUND",
    "message": "User not found or profile is private"
  }
  ```

---

### GET /v1/users/leaderboard

- **Purpose:** Rank up to 100 Clerk users by total contributions over the 7-day window.
- **Response items:** `{ rank, username, avatar, contributions, currentStreak }` with ranks re-numbered after omitting users whose stats failed.
- **Errors:** 500 on failure.

---

### GET /v1/projects/contributors

- **Purpose:** Aggregate GitHub contributors across the hardcoded repos `Githubstreak/Githubstreak-frontend` and `Githubstreak/Githubstreak-backend`.
- **Response items:** `{ login, contributions, avatarUrl }` using only the first GitHub API page per repo.
- **Errors:** 500 on failure.

---

### GET /badge/:username

- **Purpose:** Generate an embeddable SVG badge showing user's current streak.
- **Query Parameters:**
  | Parameter | Type | Default | Description |
  | --------- | ------ | ------- | ----------------------------------------------- |
  | `style` | string | `flat` | Badge style: `flat`, `plastic`, `for-the-badge` |
  | `theme` | string | `dark` | Color theme: `dark`, `light` |
- **Response:** `image/svg+xml` with `Cache-Control: public, max-age=3600`
- **Badge Colors:**
  - Gray: 0 days
  - Blue: 1-6 days
  - Green: 7-29 days
  - Gold: 30-99 days
  - Purple: 100+ days
- **Errors:** 400 for invalid username; returns gray "0 day streak" badge if user not found.

---

## Notes and Limits

- No HTTP authentication; any caller can request any `id`.
- Leaderboard scope is limited to the first 100 Clerk users; failed users are excluded without gaps in rank numbers.
- Contributor totals exclude additional pages beyond the GitHub API default page size.
- **Timezone:** All dates are stored and returned in UTC. Streak resets at midnight UTC.
- **Sync frequency:** On-demand via `/v1/users/stat?refresh=true` or `/v1/users/sync`; snapshots reused for up to 60 minutes otherwise.
- **GitHub webhook:** Not implemented; all updates are pull-based.

---

## FAQ

**Q: What timezone is `lastContributionDate` in?**
A: UTC. All dates use ISO 8601 format with trailing `Z`.

**Q: How often does the backend sync with GitHub?**
A: On-demand when endpoints are called. Snapshots are cached for 60 minutes unless `refresh=true` or `/v1/users/sync` is called.

**Q: Do streak freezes expire?**
A: No, freezes are permanent once earned based on longest streak achieved.
