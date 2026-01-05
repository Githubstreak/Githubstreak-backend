import express from "express";
import {
  createPledge,
  getActivePledge,
  getCompletedPledges,
  completePledge,
  abandonPledge,
  getTemplates,
} from "../../controllers/pledge.controller.js";

const pledgeRouter = express.Router();

// GET /v1/pledges/templates - Get available pledge templates
pledgeRouter.get("/templates", getTemplates);

// POST /v1/pledges - Create a new pledge
pledgeRouter.post("/", createPledge);

// GET /v1/pledges/active - Get user's active pledge
pledgeRouter.get("/active", getActivePledge);

// GET /v1/pledges/completed - Get user's completed pledges
pledgeRouter.get("/completed", getCompletedPledges);

// POST /v1/pledges/:id/complete - Complete a pledge
pledgeRouter.post("/:id/complete", completePledge);

// DELETE /v1/pledges/:id - Abandon a pledge
pledgeRouter.delete("/:id", abandonPledge);

export default pledgeRouter;
