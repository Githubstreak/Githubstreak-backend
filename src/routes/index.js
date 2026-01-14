import express from "express";
import userRouter from "./v1/user.routes.js";
import projectsRouter from "./v1/projects.routes.js";
import squadRouter from "./v1/squad.routes.js";
import pledgeRouter from "./v1/pledge.routes.js";
import embedRouter from "./v1/embed.routes.js";
import badgeRouter from "./v1/badge.routes.js";
import { getLeaderboard } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";

const v1Api = express.Router();

v1Api.get("/leaderboard", requireAuth, getLeaderboard);

v1Api.use("/users", userRouter);
v1Api.use("/projects", projectsRouter);
v1Api.use("/squads", squadRouter);
v1Api.use("/pledges", pledgeRouter);
v1Api.use("/embed", embedRouter);
v1Api.use("/badges", badgeRouter);

export default v1Api;
