import express from "express";
import userRouter from "./v1/user.routes.js";
import projectsRouter from "./v1/projects.routes.js";

const v1Api = express.Router();

v1Api.use("/users", userRouter);
v1Api.use("/projects", projectsRouter);

export default v1Api;
