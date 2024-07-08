import express from "express";
import { getUserStats } from "../../controllers/user.controller.js";

const userRouter = express.Router();
userRouter.get("/stat", getUserStats);

export default userRouter;
