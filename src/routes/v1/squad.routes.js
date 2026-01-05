import express from "express";
import {
  createSquad,
  getPublicSquads,
  getMySquads,
  joinSquad,
  leaveSquadController,
  getSquadDetails,
} from "../../controllers/squad.controller.js";

const squadRouter = express.Router();

// POST /v1/squads - Create a new squad
squadRouter.post("/", createSquad);

// GET /v1/squads/public - List public squads
squadRouter.get("/public", getPublicSquads);

// GET /v1/squads/my - Get user's squads
squadRouter.get("/my", getMySquads);

// POST /v1/squads/join/:code - Join squad by invite code
squadRouter.post("/join/:code", joinSquad);

// DELETE /v1/squads/:id/leave - Leave a squad
squadRouter.delete("/:id/leave", leaveSquadController);

// GET /v1/squads/:id - Get squad details
squadRouter.get("/:id", getSquadDetails);

export default squadRouter;
