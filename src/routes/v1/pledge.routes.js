import express from "express";
import {
  createPledge,
  getActivePledge,
  getCompletedPledges,
  getMyPledges,
  completePledge,
  abandonPledge,
  getTemplates,
} from "../../controllers/pledge.controller.js";
import { optionalAuth } from "../../middleware/auth.js";

const pledgeRouter = express.Router();

// GET /v1/pledges/templates - Get available pledge templates (public)
pledgeRouter.get("/templates", getTemplates);

// POST /v1/pledges - Create a new pledge (auth optional)
pledgeRouter.post("/", optionalAuth, createPledge);

// GET /v1/pledges/my - Get user's active and completed pledges (auth optional)
pledgeRouter.get("/my", optionalAuth, getMyPledges);

// GET /v1/pledges/active - Get user's active pledge (auth optional)
pledgeRouter.get("/active", optionalAuth, getActivePledge);

// GET /v1/pledges/completed - Get user's completed pledges (auth optional)
pledgeRouter.get("/completed", optionalAuth, getCompletedPledges);

// PUT /v1/pledges/:id/complete - Complete a pledge (auth optional)
pledgeRouter.put("/:id/complete", optionalAuth, completePledge);

// POST /v1/pledges/:id/complete - Complete a pledge (legacy, auth optional)
pledgeRouter.post("/:id/complete", optionalAuth, completePledge);

// DELETE /v1/pledges/:id - Abandon a pledge (auth optional)
pledgeRouter.delete("/:id", optionalAuth, abandonPledge);

export default pledgeRouter;
