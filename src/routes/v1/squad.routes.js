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
import { optionalAuth } from "../../middleware/auth.js";

const squadRouter = express.Router();

// POST /v1/squads - Create a new squad (auth optional - falls back to userId in body)
squadRouter.post("/", optionalAuth, createSquad);

// GET /v1/squads/public - List public squads
squadRouter.get("/public", getPublicSquads);

// GET /v1/squads/my - Get user's squads (auth optional - falls back to userId query)
squadRouter.get("/my", optionalAuth, getMySquads);

// POST /v1/squads/join - Join squad by invite code in body (auth optional)
squadRouter.post("/join", optionalAuth, joinSquadByBody);

// POST /v1/squads/join/:code - Join squad by invite code in URL (auth optional)
squadRouter.post("/join/:code", optionalAuth, joinSquad);

// DELETE /v1/squads/:id/leave - Leave a squad (auth optional)
squadRouter.delete("/:id/leave", optionalAuth, leaveSquadController);

// GET /v1/squads/:id - Get squad details (auth optional for private)
squadRouter.get("/:id", optionalAuth, getSquadDetails);

export default squadRouter;
