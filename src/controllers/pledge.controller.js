import {
  createPledge as createPledgeService,
  getActivePledge as getActivePledgeService,
  getCompletedPledges as getCompletedPledgesService,
  completePledge as completePledgeService,
  abandonPledge as abandonPledgeService,
  getPledgeTemplates,
} from "../services/pledge.service.js";
import { Database } from "../lib/database.js";

export const createPledge = async (req, res) => {
  const userId = req.auth?.userId || req.body.userId;
  const { templateId } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  if (!templateId) {
    return res.status(400).json({
      error: true,
      message: "templateId is required",
      code: "MISSING_TEMPLATE_ID",
    });
  }

  try {
    const db = Database.getInstance();
    const snapshot = await db.getSnapshot(userId);
    const currentStreak = snapshot?.currentStreak?.count || 0;

    const pledge = await createPledgeService(userId, templateId, currentStreak);
    res.status(201).json(pledge);
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

export const getActivePledge = async (req, res) => {
  const userId = req.auth?.userId || req.query.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    const pledge = await getActivePledgeService(userId);
    res.json(pledge || null);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

export const getCompletedPledges = async (req, res) => {
  const userId = req.auth?.userId || req.query.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    const templateIds = await getCompletedPledgesService(userId);
    res.json(templateIds);
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
 * Get both active and completed pledges for a user
 */
export const getMyPledges = async (req, res) => {
  const userId = req.auth?.userId || req.query.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    const [active, completed] = await Promise.all([
      getActivePledgeService(userId),
      getCompletedPledgesService(userId),
    ]);
    res.json({
      active: active || null,
      completed: completed || [],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

export const completePledge = async (req, res) => {
  const { id: pledgeId } = req.params;
  const userId = req.auth?.userId || req.body.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    const db = Database.getInstance();
    const snapshot = await db.getSnapshot(userId);
    const currentStreak = snapshot?.currentStreak?.count || 0;

    const result = await completePledgeService(userId, pledgeId, currentStreak);
    res.json(result);
  } catch (e) {
    console.error(e);
    if (e.code) {
      const statusCode =
        e.code === "PLEDGE_NOT_FOUND"
          ? 404
          : e.code === "UNAUTHORIZED"
          ? 403
          : e.code === "PLEDGE_INCOMPLETE"
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

export const abandonPledge = async (req, res) => {
  const { id: pledgeId } = req.params;
  const userId = req.auth?.userId || req.body.userId;

  if (!userId) {
    return res.status(400).json({
      error: true,
      message: "userId is required",
      code: "MISSING_USER_ID",
    });
  }

  try {
    await abandonPledgeService(userId, pledgeId);
    res.json({ success: true, message: "Pledge abandoned" });
  } catch (e) {
    console.error(e);
    if (e.code) {
      const statusCode =
        e.code === "PLEDGE_NOT_FOUND"
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

export const getTemplates = async (_, res) => {
  try {
    const templates = getPledgeTemplates();
    res.json(templates);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};
