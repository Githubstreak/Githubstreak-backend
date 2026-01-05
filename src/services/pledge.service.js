import { v4 as uuidv4 } from "uuid";
import { Database } from "../lib/database.js";
import { PLEDGE_TEMPLATES } from "../utils/constants.js";

/**
 * Create a new pledge
 */
export const createPledge = async (userId, templateId, currentStreak) => {
  const template = PLEDGE_TEMPLATES[templateId];

  if (!template) {
    throw { code: "INVALID_TEMPLATE", message: "Invalid pledge template" };
  }

  const db = Database.getInstance();

  // Check if user already has an active pledge
  const activePledge = await db.getActivePledge(userId);
  if (activePledge) {
    throw {
      code: "PLEDGE_ALREADY_ACTIVE",
      message: "You already have an active pledge",
    };
  }

  // Check if user has already completed this template
  const hasCompleted = await db.hasCompletedTemplate(userId, templateId);
  if (hasCompleted) {
    throw {
      code: "TEMPLATE_ALREADY_COMPLETED",
      message: "You have already completed this pledge",
    };
  }

  const pledge = {
    _id: uuidv4(),
    userId,
    templateId,
    name: template.name,
    description: `Maintain a ${template.days}-day streak`,
    targetDays: template.days,
    startingStreak: currentStreak || 0,
    status: "active",
    reward: template.reward,
    xpBonus: template.xpBonus,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  await db.createPledge(pledge);
  return pledge;
};

/**
 * Get user's active pledge
 */
export const getActivePledge = async (userId) => {
  const db = Database.getInstance();
  return await db.getActivePledge(userId);
};

/**
 * Get user's completed pledges
 */
export const getCompletedPledges = async (userId) => {
  const db = Database.getInstance();
  const pledges = await db.getCompletedPledges(userId);
  return pledges.map((p) => p.templateId);
};

/**
 * Complete a pledge and claim rewards
 */
export const completePledge = async (userId, pledgeId, currentStreak) => {
  const db = Database.getInstance();
  const pledge = await db.getPledgeById(pledgeId);

  if (!pledge) {
    throw { code: "PLEDGE_NOT_FOUND", message: "Pledge not found" };
  }

  if (pledge.userId !== userId) {
    throw {
      code: "UNAUTHORIZED",
      message: "This pledge does not belong to you",
    };
  }

  if (pledge.status !== "active") {
    throw { code: "PLEDGE_NOT_ACTIVE", message: "This pledge is not active" };
  }

  if (currentStreak < pledge.targetDays) {
    throw {
      code: "PLEDGE_INCOMPLETE",
      message: `You need a ${pledge.targetDays}-day streak to complete this pledge. Current: ${currentStreak}`,
    };
  }

  await db.updatePledge(pledgeId, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });

  return {
    xpAwarded: pledge.xpBonus,
    badgeUnlocked: pledge.reward,
    pledge: {
      ...pledge,
      status: "completed",
      completedAt: new Date().toISOString(),
    },
  };
};

/**
 * Abandon a pledge
 */
export const abandonPledge = async (userId, pledgeId) => {
  const db = Database.getInstance();
  const pledge = await db.getPledgeById(pledgeId);

  if (!pledge) {
    throw { code: "PLEDGE_NOT_FOUND", message: "Pledge not found" };
  }

  if (pledge.userId !== userId) {
    throw {
      code: "UNAUTHORIZED",
      message: "This pledge does not belong to you",
    };
  }

  if (pledge.status !== "active") {
    throw { code: "PLEDGE_NOT_ACTIVE", message: "This pledge is not active" };
  }

  await db.updatePledge(pledgeId, {
    status: "abandoned",
  });

  return { success: true };
};

/**
 * Get pledge templates
 */
export const getPledgeTemplates = () => {
  return Object.entries(PLEDGE_TEMPLATES).map(([id, template]) => ({
    id,
    ...template,
  }));
};
