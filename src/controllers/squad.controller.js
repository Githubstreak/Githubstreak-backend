import {
  createSquad as createSquadService,
  getPublicSquads as getPublicSquadsService,
  getUserSquads as getUserSquadsService,
  joinSquad as joinSquadService,
  leaveSquad as leaveSquadService,
  getSquadDetails as getSquadDetailsService,
} from "../services/squad.service.js";
import { Database } from "../lib/database.js";

/**
 * Helper to get user info from snapshot
 */
const getUserInfo = async (userId) => {
  const db = Database.getInstance();
  const snapshot = await db.getSnapshot(userId);
  return {
    username: snapshot?.username || "Unknown",
    avatar: snapshot?.avatar || "",
    streak: snapshot?.currentStreak?.count || 0,
  };
};

export const createSquad = async (req, res) => {
  const userId = req.auth?.userId || req.body.userId;
  const { name, weeklyGoal, isPrivate } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    const userInfo = await getUserInfo(userId);
    const squad = await createSquadService(userId, userInfo, {
      name,
      weeklyGoal: parseInt(weeklyGoal) || 5,
      isPrivate: isPrivate ?? false,
    });

    res.status(201).json(squad);
  } catch (e) {
    console.error(e);
    if (e.code) {
      return res.status(400).json({
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

export const getPublicSquads = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const result = await getPublicSquadsService(
      parseInt(page),
      parseInt(limit)
    );
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

export const getMySquads = async (req, res) => {
  const userId = req.auth?.userId || req.query.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    const squads = await getUserSquadsService(userId);
    res.json(squads);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

export const joinSquad = async (req, res) => {
  const { code } = req.params;
  const userId = req.auth?.userId || req.body.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  if (!code) {
    return res.status(400).json({
      error: true,
      message: "Invite code is required",
      code: "MISSING_CODE",
    });
  }

  try {
    const userInfo = await getUserInfo(userId);
    const squad = await joinSquadService(userId, userInfo, code);
    res.json(squad);
  } catch (e) {
    console.error(e);
    if (e.code) {
      const statusCode =
        e.code === "INVALID_INVITE_CODE"
          ? 404
          : e.code === "ALREADY_MEMBER"
          ? 409
          : e.code === "SQUAD_FULL"
          ? 400
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
 * Join squad using invite code from request body
 */
export const joinSquadByBody = async (req, res) => {
  const { code } = req.body;
  const userId = req.auth?.userId || req.body.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  if (!code) {
    return res.status(400).json({
      error: true,
      message: "Invite code is required in body",
      code: "MISSING_CODE",
    });
  }

  try {
    const userInfo = await getUserInfo(userId);
    const squad = await joinSquadService(userId, userInfo, code);
    res.json(squad);
  } catch (e) {
    console.error(e);
    if (e.code) {
      const statusCode =
        e.code === "INVALID_INVITE_CODE"
          ? 404
          : e.code === "ALREADY_MEMBER"
          ? 409
          : e.code === "SQUAD_FULL"
          ? 400
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

export const leaveSquadController = async (req, res) => {
  const { id: squadId } = req.params;
  const userId = req.auth?.userId || req.body.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    const result = await leaveSquadService(userId, squadId);
    res.json({
      success: true,
      deleted: result.deleted,
      newLeaderId: result.newLeaderId,
    });
  } catch (e) {
    console.error(e);
    if (e.code) {
      const statusCode = e.code === "SQUAD_NOT_FOUND" ? 404 : 400;
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

export const getSquadDetails = async (req, res) => {
  const { id: squadId } = req.params;
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required for private squads",
      code: "MISSING_USER_ID",
    });
  }

  try {
    const squad = await getSquadDetailsService(userId, squadId);
    res.json(squad);
  } catch (e) {
    console.error(e);
    if (e.code) {
      const statusCode =
        e.code === "SQUAD_NOT_FOUND"
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
    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};
