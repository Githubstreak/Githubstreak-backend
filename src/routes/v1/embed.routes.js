import express from "express";
import {
  getEmbedBadge,
  getPublicProfileData,
} from "../../controllers/embed.controller.js";

const embedRouter = express.Router();

// GET /v1/embed/:username - Generate SVG badge
embedRouter.get("/:username", getEmbedBadge);

// GET /v1/embed/:username/card - Generate SVG badge (alias for frontend compatibility)
embedRouter.get("/:username/card", getEmbedBadge);

export default embedRouter;
