import { v4 as uuidv4 } from "uuid";
import { Database } from "../lib/database.js";
import { SQUAD_LIMITS } from "../utils/constants.js";

/**
 * Generate a unique 6-character invite code
 */
const generateInviteCode = async () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const db = Database.getInstance();

  let code;
  let isUnique = false;

  while (!isUnique) {
    code = "";
    for (let i = 0; i < SQUAD_LIMITS.CODE_LENGTH; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    isUnique = await db.isSquadCodeUnique(code);
  }

  return code;
};

/**
 * Calculate squad rank among all squads
 */
const calculateSquadRanks = async () => {
  const db = Database.getInstance();
  const allSquads = await db.conn
    .collection("squads")
    .find({})
    .sort({ totalStreak: -1 })
    .toArray();

  for (let i = 0; i < allSquads.length; i++) {
    await db.updateSquad(allSquads[i]._id, { rank: i + 1 });
  }
};

/**
 * Calculate XP multiplier based on member count
 */
export const calculateXpMultiplier = (memberCount) => {
  const multiplier = 1 + memberCount * 0.1;
  return Math.min(multiplier, 2.0);
};

/**
 * Create a new squad
 */
export const createSquad = async (
  userId,
  userInfo,
  { name, weeklyGoal, isPrivate }
) => {
  if (!name || name.length > SQUAD_LIMITS.MAX_NAME_LENGTH) {
    throw {
      code: "INVALID_NAME",
      message: "Squad name is required and must be 30 characters or less",
    };
  }

  if (![5, 7].includes(weeklyGoal)) {
    throw { code: "INVALID_GOAL", message: "Weekly goal must be 5 or 7" };
  }

  const db = Database.getInstance();
  const code = await generateInviteCode();

  const squad = {
    _id: uuidv4(),
    name: name.trim(),
    code,
    leaderId: userId,
    members: [
      {
        userId,
        username: userInfo.username,
        avatar: userInfo.avatar,
        streak: userInfo.streak || 0,
        joinedAt: new Date().toISOString(),
        isLeader: true,
      },
    ],
    weeklyGoal,
    weeklyProgress: 0,
    totalStreak: userInfo.streak || 0,
    rank: 0,
    isPrivate: isPrivate ?? false,
  };

  await db.createSquad(squad);
  await calculateSquadRanks();

  return await db.getSquadById(squad._id);
};

/**
 * Get public squads with pagination
 */
export const getPublicSquads = async (page = 1, limit = 20) => {
  const db = Database.getInstance();
  const result = await db.getPublicSquads(page, limit);

  const squads = result.squads.map((squad) => ({
    id: squad._id,
    name: squad.name,
    code: squad.code,
    memberCount: squad.members.length,
    totalStreak: squad.totalStreak,
    weeklyGoal: squad.weeklyGoal,
    rank: squad.rank,
  }));

  return {
    squads,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: Math.ceil(result.total / result.limit),
  };
};

/**
 * Get user's squads
 */
export const getUserSquads = async (userId) => {
  const db = Database.getInstance();
  const squads = await db.getUserSquads(userId);

  return squads.map((squad) => ({
    id: squad._id,
    name: squad.name,
    code: squad.code,
    memberCount: squad.members.length,
    totalStreak: squad.totalStreak,
    weeklyGoal: squad.weeklyGoal,
    weeklyProgress: squad.weeklyProgress,
    rank: squad.rank,
    isLeader: squad.leaderId === userId,
    members: squad.members,
  }));
};

/**
 * Join a squad by invite code
 */
export const joinSquad = async (userId, userInfo, code) => {
  const db = Database.getInstance();
  const squad = await db.getSquadByCode(code);

  if (!squad) {
    throw { code: "INVALID_INVITE_CODE", message: "Invalid invite code" };
  }

  const isMember = squad.members.some((m) => m.userId === userId);
  if (isMember) {
    throw {
      code: "ALREADY_MEMBER",
      message: "You are already a member of this squad",
    };
  }

  if (squad.members.length >= SQUAD_LIMITS.MAX_MEMBERS) {
    throw {
      code: "SQUAD_FULL",
      message: "This squad is full (max 10 members)",
    };
  }

  const newMember = {
    userId,
    username: userInfo.username,
    avatar: userInfo.avatar,
    streak: userInfo.streak || 0,
    joinedAt: new Date().toISOString(),
    isLeader: false,
  };

  const updatedMembers = [...squad.members, newMember];
  const totalStreak = updatedMembers.reduce(
    (sum, m) => sum + (m.streak || 0),
    0
  );

  await db.updateSquad(squad._id, {
    members: updatedMembers,
    totalStreak,
  });

  await calculateSquadRanks();

  return await db.getSquadById(squad._id);
};

/**
 * Leave a squad
 */
export const leaveSquad = async (userId, squadId) => {
  const db = Database.getInstance();
  const squad = await db.getSquadById(squadId);

  if (!squad) {
    throw { code: "SQUAD_NOT_FOUND", message: "Squad not found" };
  }

  const isMember = squad.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw { code: "NOT_MEMBER", message: "You are not a member of this squad" };
  }

  const updatedMembers = squad.members.filter((m) => m.userId !== userId);

  if (updatedMembers.length === 0) {
    await db.deleteSquad(squadId);
    return { deleted: true };
  }

  const isLeader = squad.leaderId === userId;
  let newLeaderId = squad.leaderId;

  if (isLeader) {
    newLeaderId = updatedMembers[0].userId;
    updatedMembers[0].isLeader = true;
  }

  const totalStreak = updatedMembers.reduce(
    (sum, m) => sum + (m.streak || 0),
    0
  );

  await db.updateSquad(squadId, {
    members: updatedMembers,
    leaderId: newLeaderId,
    totalStreak,
  });

  await calculateSquadRanks();

  return { deleted: false, newLeaderId };
};

/**
 * Get squad details
 */
export const getSquadDetails = async (userId, squadId) => {
  const db = Database.getInstance();
  const squad = await db.getSquadById(squadId);

  if (!squad) {
    throw { code: "SQUAD_NOT_FOUND", message: "Squad not found" };
  }

  if (squad.isPrivate) {
    const isMember = squad.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw {
        code: "UNAUTHORIZED",
        message: "You don't have access to this private squad",
      };
    }
  }

  return {
    id: squad._id,
    name: squad.name,
    code: squad.code,
    leaderId: squad.leaderId,
    members: squad.members,
    weeklyGoal: squad.weeklyGoal,
    weeklyProgress: squad.weeklyProgress,
    totalStreak: squad.totalStreak,
    rank: squad.rank,
    isPrivate: squad.isPrivate,
    xpMultiplier: calculateXpMultiplier(squad.members.length),
    createdAt: squad.createdAt,
    updatedAt: squad.updatedAt,
  };
};

/**
 * Update member streaks in all squads (should be called periodically)
 */
export const updateSquadStreaks = async () => {
  const db = Database.getInstance();
  const allSquads = await db.conn.collection("squads").find({}).toArray();

  for (const squad of allSquads) {
    const updatedMembers = [];

    for (const member of squad.members) {
      const snapshot = await db.getSnapshot(member.userId);
      const streak = snapshot?.currentStreak?.count ?? member.streak;
      updatedMembers.push({ ...member, streak });
    }

    const totalStreak = updatedMembers.reduce(
      (sum, m) => sum + (m.streak || 0),
      0
    );

    await db.updateSquad(squad._id, {
      members: updatedMembers,
      totalStreak,
    });
  }

  await calculateSquadRanks();
};
