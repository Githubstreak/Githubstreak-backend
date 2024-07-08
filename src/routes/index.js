import express from "express";
import userRouter from "./v1/user.routes.js";

const v1Api = express.Router();

v1Api.use("/users", userRouter);

export default v1Api;
