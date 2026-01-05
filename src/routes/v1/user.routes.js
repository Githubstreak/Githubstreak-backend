import express from "express";
import {
  getUserStats,
  getLeaderboard,
  useFreeze,
  syncUser,
  getPublicUserStats,
} from "../../controllers/user.controller.js";
import { getPublicProfileData } from "../../controllers/embed.controller.js";
import apicache from "apicache";
import { cacheTime } from "../../utils/constants.js";

const userRouter = express.Router();
const { middleware: cache } = apicache;

const onlyStatus200 = (_, res) => res.statusCode === 200;

userRouter.get(
  "/stat",
  cache(cacheTime.API_CACHE_TIME, onlyStatus200),
  getUserStats
);
userRouter.get(
  "/leaderboard",
  cache(cacheTime.API_CACHE_TIME, onlyStatus200),
  getLeaderboard
);
userRouter.post("/use-freeze", useFreeze);
userRouter.post("/sync", syncUser);
userRouter.get("/public/:username", getPublicUserStats);
userRouter.get("/:username/profile", getPublicProfileData);

export default userRouter;
