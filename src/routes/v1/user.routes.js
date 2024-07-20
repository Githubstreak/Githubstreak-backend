import express from "express";
import {
  getUserStats,
  getLeaderboard,
} from "../../controllers/user.controller.js";
import apicache from "apicache";
import { cacheTime } from "../../utils/constants.js";

const userRouter = express.Router();
const { middleware: cache } = apicache;

userRouter.get("/stat", cache(cacheTime.API_CACHE_TIME), getUserStats);
userRouter.get("/leaderboard", cache(cacheTime.API_CACHE_TIME), getLeaderboard);

export default userRouter;
