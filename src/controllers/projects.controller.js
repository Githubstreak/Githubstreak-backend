import {
  fetchContributors,
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  refreshProjectStats,
  getProjectsByUser,
} from "../services/projects.service.js";
import { cacheTime } from "../utils/constants.js";

export const getContributors = async (_, res) => {
  try {
    const contributors = await fetchContributors();
    res.setHeader(
      "Cache-Control",
      `public, max-age=${cacheTime.BROWSER_CACHE_TIME}`
    );
    res.json(contributors);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /v1/projects - List all projects with filtering and pagination
 */
export const listProjects = async (req, res) => {
  try {
    const { page, limit, language, lookingForContributors, search } = req.query;
    // Rename language to projectLanguage for backend compatibility
    const result = await getProjects({
      page,
      limit,
      projectLanguage: language,
      lookingForContributors,
      search,
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * GET /v1/projects/my - Get user's submitted projects
 */
export const getMyProjects = async (req, res) => {
  const userId = req.auth?.userId || req.query.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    const projects = await getProjectsByUser(userId);
    res.json(projects);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * GET /v1/projects/:id - Get single project details
 */
export const getProject = async (req, res) => {
  const { id } = req.params;

  try {
    const project = await getProjectById(id);

    if (!project) {
      return res.status(404).json({
        error: true,
        message: "Project not found",
        code: "PROJECT_NOT_FOUND",
      });
    }

    res.json(project);
  } catch (e) {
    console.error(e);

    // Handle invalid MongoDB ObjectId
    if (e.name === "CastError") {
      return res.status(400).json({
        error: true,
        message: "Invalid project ID",
        code: "INVALID_ID",
      });
    }

    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * POST /v1/projects - Submit a new project
 */
export const submitProject = async (req, res) => {
  const userId = req.auth?.userId || req.body.userId;
  const { repoUrl, description, techStack, lookingForContributors } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  if (!repoUrl) {
    return res.status(400).json({
      error: true,
      message: "repoUrl is required",
      code: "MISSING_REPO_URL",
    });
  }

  try {
    const project = await createProject(userId, repoUrl, {
      description,
      techStack,
      lookingForContributors,
    });

    res.status(201).json(project);
  } catch (e) {
    console.error(e);

    if (e.code) {
      const statusCode =
        e.code === "INVALID_URL"
          ? 400
          : e.code === "DUPLICATE_PROJECT"
          ? 409
          : e.code === "REPO_NOT_FOUND"
          ? 404
          : e.code === "RATE_LIMITED"
          ? 429
          : 400;

      return res.status(statusCode).json({
        error: true,
        message: e.message,
        code: e.code,
      });
    }

    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * PUT /v1/projects/:id - Update a project
 */
export const editProject = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth?.userId || req.body.userId;
  const { description, techStack, lookingForContributors } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    const project = await updateProject(id, userId, {
      description,
      techStack,
      lookingForContributors,
    });

    res.json(project);
  } catch (e) {
    console.error(e);

    if (e.code) {
      const statusCode =
        e.code === "PROJECT_NOT_FOUND"
          ? 404
          : e.code === "UNAUTHORIZED"
          ? 403
          : 400;

      return res.status(statusCode).json({
        error: true,
        message: e.message,
        code: e.code,
      });
    }

    if (e.name === "CastError") {
      return res.status(400).json({
        error: true,
        message: "Invalid project ID",
        code: "INVALID_ID",
      });
    }

    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * DELETE /v1/projects/:id - Delete a project
 */
export const removeProject = async (req, res) => {
  const { id } = req.params;
  const userId = req.auth?.userId || req.body.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    await deleteProject(id, userId);
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (e) {
    console.error(e);

    if (e.code) {
      const statusCode =
        e.code === "PROJECT_NOT_FOUND"
          ? 404
          : e.code === "UNAUTHORIZED"
          ? 403
          : 400;

      return res.status(statusCode).json({
        error: true,
        message: e.message,
        code: e.code,
      });
    }

    if (e.name === "CastError") {
      return res.status(400).json({
        error: true,
        message: "Invalid project ID",
        code: "INVALID_ID",
      });
    }

    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * POST /v1/projects/:id/refresh - Refresh GitHub stats
 */
export const refreshProject = async (req, res) => {
  const { id } = req.params;

  try {
    const project = await refreshProjectStats(id);
    res.json(project);
  } catch (e) {
    console.error(e);

    if (e.code) {
      const statusCode =
        e.code === "PROJECT_NOT_FOUND"
          ? 404
          : e.code === "RATE_LIMITED"
          ? 429
          : 400;

      return res.status(statusCode).json({
        error: true,
        message: e.message,
        code: e.code,
      });
    }

    if (e.name === "CastError") {
      return res.status(400).json({
        error: true,
        message: "Invalid project ID",
        code: "INVALID_ID",
      });
    }

    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};
