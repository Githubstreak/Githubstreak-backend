import mongoose from "mongoose";

let instance;

export class Database {
  constructor() {
    if (instance) return instance;

    instance = this;
  }

  async #checkConn() {
    if (!this.conn) await this.connect();
  }

  static getInstance() {
    if (!instance) {
      instance = new Database();
    }

    return instance;
  }

  async connect() {
    if (mongoose.connection.readyState > 1) return;

    const { connection } = await mongoose.connect(process.env.DB_URI);

    console.log(`DB Connected - ${connection.host}`);
    this.conn = connection;
  }

  async getSnapshot(userId) {
    await this.#checkConn();

    const snapshot = await this.conn
      .collection("snapshots")
      .findOne({ _id: userId });

    return snapshot;
  }

  async saveSnapshot(userId, snapshot) {
    await this.#checkConn();

    const currentTime = new Date();

    await this.conn.collection("snapshots").updateOne(
      { _id: userId },
      {
        $set: { ...snapshot, updatedAt: currentTime },
        $setOnInsert: { createdAt: currentTime },
      },
      { upsert: true }
    );
  }

  async getSnapshotByUsername(username) {
    await this.#checkConn();

    const snapshot = await this.conn
      .collection("snapshots")
      .findOne({ username });

    return snapshot;
  }

  async getAllSnapshots() {
    await this.#checkConn();

    return await this.conn.collection("snapshots").find({}).toArray();
  }

  async getUserFreeze(userId) {
    await this.#checkConn();

    const freeze = await this.conn
      .collection("freezes")
      .findOne({ _id: userId });

    return freeze || { usedFreezes: 0, lastFreezeUsedAt: null };
  }

  async useFreeze(userId) {
    await this.#checkConn();

    const currentTime = new Date();

    await this.conn.collection("freezes").updateOne(
      { _id: userId },
      {
        $inc: { usedFreezes: 1 },
        $set: { lastFreezeUsedAt: currentTime, updatedAt: currentTime },
        $setOnInsert: { createdAt: currentTime },
      },
      { upsert: true }
    );
  }

  async getLastSync(userId) {
    await this.#checkConn();

    const syncRecord = await this.conn
      .collection("syncs")
      .findOne({ _id: userId });

    return syncRecord?.lastSyncedAt || null;
  }

  async updateLastSync(userId) {
    await this.#checkConn();

    const currentTime = new Date();

    await this.conn.collection("syncs").updateOne(
      { _id: userId },
      {
        $set: { lastSyncedAt: currentTime },
        $setOnInsert: { createdAt: currentTime },
      },
      { upsert: true }
    );
  }

  // ============ SQUAD METHODS ============

  async createSquad(squad) {
    await this.#checkConn();
    const currentTime = new Date();
    const squadDoc = {
      ...squad,
      createdAt: currentTime,
      updatedAt: currentTime,
    };
    await this.conn.collection("squads").insertOne(squadDoc);
    return squadDoc;
  }

  async getSquadById(squadId) {
    await this.#checkConn();
    return await this.conn.collection("squads").findOne({ _id: squadId });
  }

  async getSquadByCode(code) {
    await this.#checkConn();
    return await this.conn
      .collection("squads")
      .findOne({ code: code.toUpperCase() });
  }

  async getPublicSquads(page = 1, limit = 20) {
    await this.#checkConn();
    const skip = (page - 1) * limit;
    const squads = await this.conn
      .collection("squads")
      .find({ isPrivate: false })
      .sort({ totalStreak: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const total = await this.conn
      .collection("squads")
      .countDocuments({ isPrivate: false });
    return { squads, total, page, limit };
  }

  async getUserSquads(userId) {
    await this.#checkConn();
    return await this.conn
      .collection("squads")
      .find({ "members.userId": userId })
      .toArray();
  }

  async updateSquad(squadId, updates) {
    await this.#checkConn();
    const currentTime = new Date();
    await this.conn.collection("squads").updateOne(
      { _id: squadId },
      {
        $set: { ...updates, updatedAt: currentTime },
      }
    );
  }

  async deleteSquad(squadId) {
    await this.#checkConn();
    await this.conn.collection("squads").deleteOne({ _id: squadId });
  }

  async isSquadCodeUnique(code) {
    await this.#checkConn();
    const existing = await this.conn
      .collection("squads")
      .findOne({ code: code.toUpperCase() });
    return !existing;
  }

  // ============ PLEDGE METHODS ============

  async createPledge(pledge) {
    await this.#checkConn();
    const currentTime = new Date();
    const pledgeDoc = {
      ...pledge,
      createdAt: currentTime,
    };
    await this.conn.collection("pledges").insertOne(pledgeDoc);
    return pledgeDoc;
  }

  async getPledgeById(pledgeId) {
    await this.#checkConn();
    return await this.conn.collection("pledges").findOne({ _id: pledgeId });
  }

  async getActivePledge(userId) {
    await this.#checkConn();
    return await this.conn
      .collection("pledges")
      .findOne({ userId, status: "active" });
  }

  async getCompletedPledges(userId) {
    await this.#checkConn();
    return await this.conn
      .collection("pledges")
      .find({ userId, status: "completed" })
      .toArray();
  }

  async updatePledge(pledgeId, updates) {
    await this.#checkConn();
    await this.conn
      .collection("pledges")
      .updateOne({ _id: pledgeId }, { $set: updates });
  }

  async hasCompletedTemplate(userId, templateId) {
    await this.#checkConn();
    const existing = await this.conn.collection("pledges").findOne({
      userId,
      templateId,
      status: "completed",
    });
    return !!existing;
  }
}

const database = new Database();
export default database;
