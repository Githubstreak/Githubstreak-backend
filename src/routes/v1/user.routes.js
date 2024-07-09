import express from "express";
import {
  getUserStats,
  getLeaderboard,
} from "../../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.get("/stat", getUserStats);
userRouter.get("/leaderboard", getLeaderboard);

export default userRouter;
