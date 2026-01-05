# Githubstreak Backend

## Public API Contract (v1)

Endpoints support GET, POST, PATCH, and DELETE methods. CORS is open to any origin. Data may be cached by the server and proxies for up to 1 hour; user stats may also be served from a Mongo snapshot up to 60 minutes old.

---

## User Endpoints

### GET /v1/users/stat?id={clerkUserId}[&refresh=true]

- **Purpose:** Return the user's contribution stats for frontend streak display.
- **Window:** Last 365 calendar days (UTC-midnight bounded).
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
    "contributionDays": [{ "date": "2026-01-04", "count": 5 }],
    "weeklyStats": {
      "Sun": 45,
      "Mon": 120,
      "Tue": 135,
      "Wed": 140,
      "Thu": 125,
      "Fri": 110,
      "Sat": 60
    },
    "monthlyStats": [{ "month": "2026-01", "count": 32 }]
  }
  ```
- **Errors:** 400 if `id` missing; 500 otherwise.

### POST /v1/users/sync

- **Purpose:** Manually trigger a GitHub data refresh.
- **Rate Limit:** 1 sync per user per 5 minutes.
- **Request Body:** `{ "userId": "clerk_user_id" }`
- **Response:** `{ success, message, data: { currentStreak, contributions, lastSyncedAt } }`
- **Errors:** 400, 429 (rate limited), 500.

### POST /v1/users/use-freeze

- **Purpose:** Use a streak freeze token.
- **Request Body:** `{ "userId": "clerk_user_id" }`
- **Response:** `{ success, data: { usedFreezes, availableFreezes, currentStreak, streakRestored } }`

### GET /v1/users/public/:username

- **Purpose:** Lookup public stats for streak battles.
- **Response:** `{ success, data: { username, avatarUrl, currentStreak, longestStreak, contributions, isPublic } }`

### GET /v1/users/:username/profile

- **Purpose:** Get public profile data with tier and rank.
- **Response:** `{ username, avatar, currentStreak, longestStreak, contributions, tier, rank }`

### GET /v1/users/leaderboard

- **Purpose:** Rank up to 100 users by contributions.
- **Response:** `[{ rank, username, avatar, contributions, currentStreak }]`

---

## Squad Endpoints (Team Challenges)

### POST /v1/squads

- **Purpose:** Create a new squad.
- **Request Body:** `{ "userId": "string", "name": "string", "weeklyGoal": 5|7, "isPrivate": boolean }`
- **Response:** Full squad object with generated 6-char invite code.
- **Limits:** Max 10 members per squad, name max 30 chars.

### GET /v1/squads/public?page=1&limit=20

- **Purpose:** List public squads.
- **Response:** `{ squads: [...], total, page, limit, totalPages }`

### GET /v1/squads/my?userId={clerkUserId}

- **Purpose:** Get user's squads.
- **Response:** Array of squad objects.

### POST /v1/squads/join/:code

- **Purpose:** Join squad by invite code.
- **Request Body:** `{ "userId": "string" }`
- **Errors:** INVALID_INVITE_CODE, ALREADY_MEMBER, SQUAD_FULL

### DELETE /v1/squads/:id/leave

- **Purpose:** Leave a squad.
- **Request Body:** `{ "userId": "string" }`
- **Note:** If leader leaves, new leader is assigned; if empty, squad is deleted.

### GET /v1/squads/:id?userId={clerkUserId}

- **Purpose:** Get squad details.
- **Note:** userId required for private squads.
- **Response:** Full squad with members, XP multiplier (1 + memberCount \* 0.1, max 2.0).

---

## Pledge Endpoints (Commitment System)

### GET /v1/pledges/templates

- **Purpose:** Get available pledge templates.
- **Response:**
  ```json
  [
    {
      "id": "7-day",
      "name": "Week Warrior",
      "days": 7,
      "reward": "Week Warrior badge",
      "xpBonus": 100
    },
    {
      "id": "30-day",
      "name": "Monthly Master",
      "days": 30,
      "reward": "Monthly Master badge + Freeze Token",
      "xpBonus": 500
    },
    {
      "id": "100-day",
      "name": "Century Legend",
      "days": 100,
      "reward": "Century badge + Profile flair",
      "xpBonus": 2000
    },
    {
      "id": "365-day",
      "name": "Yearly Champion",
      "days": 365,
      "reward": "Yearly Champion title + All badges",
      "xpBonus": 10000
    }
  ]
  ```

### POST /v1/pledges

- **Purpose:** Create a new pledge.
- **Request Body:** `{ "userId": "string", "templateId": "7-day|30-day|100-day|365-day" }`
- **Errors:** PLEDGE_ALREADY_ACTIVE, TEMPLATE_ALREADY_COMPLETED, INVALID_TEMPLATE

### GET /v1/pledges/active?userId={clerkUserId}

- **Purpose:** Get user's active pledge.
- **Response:** Pledge object or null.

### GET /v1/pledges/completed?userId={clerkUserId}

- **Purpose:** Get user's completed pledge template IDs.
- **Response:** `["7-day", "30-day"]`

### POST /v1/pledges/:id/complete

- **Purpose:** Complete pledge and claim rewards.
- **Request Body:** `{ "userId": "string" }`
- **Validation:** currentStreak >= pledge.targetDays
- **Response:** `{ xpAwarded, badgeUnlocked, pledge }`
- **Errors:** PLEDGE_INCOMPLETE, PLEDGE_NOT_FOUND

### DELETE /v1/pledges/:id

- **Purpose:** Abandon a pledge.
- **Request Body:** `{ "userId": "string" }`

---

## Embed Endpoints (Shareable Cards)

### GET /v1/embed/:username?theme=dark

- **Purpose:** Generate embeddable SVG profile card.
- **Themes:** `dark`, `midnight`, `fire`, `ocean`, `forest`
- **Response:** `image/svg+xml` with `Cache-Control: public, max-age=3600`
- **Card includes:** Avatar, username, streak count, tier badge, contributions, branding.

### GET /badge/:username?style=flat&theme=dark

- **Purpose:** Generate simple streak badge.
- **Styles:** `flat`, `plastic`, `for-the-badge`
- **Themes:** `dark`, `light`

---

## Other Endpoints

### GET /v1/projects/contributors

- **Purpose:** Aggregate GitHub contributors across community repos.
- **Response:** `[{ login, contributions, avatarUrl }]`

---

## Streak Tiers

| Tier      | Days    | Color  |
| --------- | ------- | ------ |
| Starter   | 0-6     | Gray   |
| Rising    | 7-29    | Blue   |
| Warrior   | 30-99   | Green  |
| Master    | 100-364 | Gold   |
| Legendary | 365+    | Purple |

---

## Error Response Format

```json
{
  "error": true,
  "message": "Human readable error message",
  "code": "ERROR_CODE"
}
```

Common error codes: `SQUAD_NOT_FOUND`, `INVALID_INVITE_CODE`, `ALREADY_MEMBER`, `SQUAD_FULL`, `PLEDGE_ALREADY_ACTIVE`, `PLEDGE_INCOMPLETE`, `UNAUTHORIZED`, `RATE_LIMITED`

---

## Notes

- **Timezone:** All dates are UTC. Streak resets at midnight UTC.
- **Weekly progress:** Resets every Sunday at midnight UTC.
- **XP multiplier:** Squad XP = base _ (1 + memberCount _ 0.1), max 2.0
- **Sync frequency:** Snapshots cached 60 minutes unless refresh=true.
