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
}

const database = new Database();
export default database;
