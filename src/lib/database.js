import mongoose from "mongoose";

let instance;

export class Database {
  constructor() {
    if (instance) return instance;

    instance = this;
  }

  #checkConn() {
    if (!this.conn) throw new Error("No connection to db");
  }

  static getInstance() {
    if (!instance) {
      instance = new Database();
    }

    return instance;
  }

  async connect() {
    try {
      if (mongoose.connection.readyState > 1) return;

      const { connection } = await mongoose.connect(process.env.DB_URI);

      console.log(`DB Connected - ${connection.host}`);
      this.conn = connection;
    } catch (error) {
      throw error;
    }
  }

  async getSnapshot(userId) {
    this.#checkConn();

    try {
      const snapshot = await this.conn
        .collection("snapshots")
        .findOne({ _id: userId });

      return snapshot;
    } catch (error) {
      throw error;
    }
  }

  async saveSnapshot(userId, snapshot) {
    this.#checkConn();

    try {
      const currentTime = new Date();

      await this.conn.collection("snapshots").updateOne(
        { _id: userId },
        {
          $set: { ...snapshot, updatedAt: currentTime },
          $setOnInsert: { createdAt: currentTime },
        },
        { upsert: true },
      );
    } catch (error) {
      throw error;
    }
  }
}

const database = new Database();
export default database;
