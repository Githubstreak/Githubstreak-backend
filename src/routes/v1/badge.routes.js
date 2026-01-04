import express from "express";
import { getBadge } from "../../controllers/badge.controller.js";

const badgeRouter = express.Router();

badgeRouter.get("/:username", getBadge);

export default badgeRouter;
