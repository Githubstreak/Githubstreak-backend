import express from "express";
import {
  getUserStats,
  getLeaderboard,
} from "../../controllers/user.controller.js";
import apicache from "apicache";
import { cacheTime } from "../../utils/constants.js";

const userRouter = express.Router();
const { middleware: cache } = apicache;

const onlyStatus200 = (_, res) => res.statusCode === 200;

userRouter.get(
  "/stat",
  cache(cacheTime.API_CACHE_TIME, onlyStatus200),
  getUserStats,
);
userRouter.get(
  "/leaderboard",
  cache(cacheTime.API_CACHE_TIME, onlyStatus200),
  getLeaderboard,
);

export default userRouter;
