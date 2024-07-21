import cors from "cors";
import "dotenv/config";
import express from "express";
import database from "./lib/database.js";
import v1Api from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET"],
  }),
);

const port = process.env.PORT || 3001;

app.use("/v1", v1Api);

const startServer = async () => {
  try {
    await database.connect();
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  }
};

startServer();
