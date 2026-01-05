import express from "express";
import {
  getContributors,
  listProjects,
  getProject,
  getMyProjects,
  submitProject,
  editProject,
  removeProject,
  refreshProject,
} from "../../controllers/projects.controller.js";
import { optionalAuth } from "../../middleware/auth.js";
import apicache from "apicache";
import { cacheTime } from "../../utils/constants.js";

const projectsRouter = express.Router();
const { middleware: cache } = apicache;

const onlyStatus200 = (_, res) => res.statusCode === 200;

// GET /v1/projects - List all projects with filtering and pagination
projectsRouter.get(
  "/",
  cache(cacheTime.API_CACHE_TIME, onlyStatus200),
  listProjects
);

// GET /v1/projects/contributors - Get community project contributors
projectsRouter.get(
  "/contributors",
  cache(cacheTime.API_CACHE_TIME, onlyStatus200),
  getContributors
);

// GET /v1/projects/my - Get user's submitted projects
projectsRouter.get("/my", optionalAuth, getMyProjects);

// GET /v1/projects/:id - Get single project details
projectsRouter.get("/:id", getProject);

// POST /v1/projects - Submit a new project
projectsRouter.post("/", optionalAuth, submitProject);

// PUT /v1/projects/:id - Update a project (owner only)
projectsRouter.put("/:id", optionalAuth, editProject);

// DELETE /v1/projects/:id - Delete a project (owner only)
projectsRouter.delete("/:id", optionalAuth, removeProject);

// POST /v1/projects/:id/refresh - Refresh GitHub stats
projectsRouter.post("/:id/refresh", refreshProject);

export default projectsRouter;
