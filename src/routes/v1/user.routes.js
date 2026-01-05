import express from "express";
import {
  getUserStats,
  getLeaderboard,
  useFreeze,
  syncUser,
  getPublicUserStats,
} from "../../controllers/user.controller.js";
import { getPublicProfileData } from "../../controllers/embed.controller.js";
import { optionalAuth } from "../../middleware/auth.js";
import apicache from "apicache";
import { cacheTime } from "../../utils/constants.js";

const userRouter = express.Router();
const { middleware: cache } = apicache;

const onlyStatus200 = (_, res) => res.statusCode === 200;

// GET /v1/users/stat - Get user stats (auth optional - falls back to id query param)
userRouter.get(
  "/stat",
  optionalAuth,
  cache(cacheTime.API_CACHE_TIME, onlyStatus200),
  getUserStats
);

// GET /v1/users/leaderboard - Get leaderboard (public)
userRouter.get(
  "/leaderboard",
  cache(cacheTime.API_CACHE_TIME, onlyStatus200),
  getLeaderboard
);

// POST /v1/users/use-freeze - Use a streak freeze (auth optional)
userRouter.post("/use-freeze", optionalAuth, useFreeze);

// POST /v1/users/sync - Force sync user data (auth optional)
userRouter.post("/sync", optionalAuth, syncUser);

// GET /v1/users/public/:username - Get public user stats
userRouter.get("/public/:username", getPublicUserStats);

// GET /v1/users/:username/profile - Get public profile data
userRouter.get("/:username/profile", getPublicProfileData);

export default userRouter;
