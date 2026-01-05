import express from "express";
import {
  getEmbedBadge,
  getPublicProfileData,
} from "../../controllers/embed.controller.js";

const embedRouter = express.Router();

// GET /v1/embed/:username - Generate SVG badge
embedRouter.get("/:username", getEmbedBadge);

export default embedRouter;
