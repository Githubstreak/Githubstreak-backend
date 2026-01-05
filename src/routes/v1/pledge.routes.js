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
import { requireAuth } from "../../middleware/auth.js";

const pledgeRouter = express.Router();

// GET /v1/pledges/templates - Get available pledge templates (public)
pledgeRouter.get("/templates", getTemplates);

// POST /v1/pledges - Create a new pledge (auth required)
pledgeRouter.post("/", requireAuth, createPledge);

// GET /v1/pledges/my - Get user's active and completed pledges (auth required)
pledgeRouter.get("/my", requireAuth, getMyPledges);

// GET /v1/pledges/active - Get user's active pledge (auth required)
pledgeRouter.get("/active", requireAuth, getActivePledge);

// GET /v1/pledges/completed - Get user's completed pledges (auth required)
pledgeRouter.get("/completed", requireAuth, getCompletedPledges);

// PUT /v1/pledges/:id/complete - Complete a pledge (auth required)
pledgeRouter.put("/:id/complete", requireAuth, completePledge);

// POST /v1/pledges/:id/complete - Complete a pledge (legacy, auth required)
pledgeRouter.post("/:id/complete", requireAuth, completePledge);

// DELETE /v1/pledges/:id - Abandon a pledge (auth required)
pledgeRouter.delete("/:id", requireAuth, abandonPledge);

export default pledgeRouter;
