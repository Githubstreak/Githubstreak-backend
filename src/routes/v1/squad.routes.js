import express from "express";
import {
  createSquad,
  getPublicSquads,
  getMySquads,
  joinSquad,
  joinSquadByBody,
  leaveSquadController,
  getSquadDetails,
} from "../../controllers/squad.controller.js";
import { requireAuth } from "../../middleware/auth.js";

const squadRouter = express.Router();

// POST /v1/squads - Create a new squad (auth required)
squadRouter.post("/", requireAuth, createSquad);

// GET /v1/squads/public - List public squads
squadRouter.get("/public", getPublicSquads);

// GET /v1/squads/my - Get user's squads (auth required)
squadRouter.get("/my", requireAuth, getMySquads);

// POST /v1/squads/join - Join squad by invite code in body (auth required)
squadRouter.post("/join", requireAuth, joinSquadByBody);

// POST /v1/squads/join/:code - Join squad by invite code in URL (auth required)
squadRouter.post("/join/:code", requireAuth, joinSquad);

// DELETE /v1/squads/:id/leave - Leave a squad (auth required)
squadRouter.delete("/:id/leave", requireAuth, leaveSquadController);

// GET /v1/squads/:id - Get squad details (auth required for private)
squadRouter.get("/:id", getSquadDetails);

export default squadRouter;
