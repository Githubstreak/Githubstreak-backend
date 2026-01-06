import cors from "cors";
import "dotenv/config";
import express from "express";
import database from "./lib/database.js";
import v1Api from "./routes/index.js";
import badgeRouter from "./routes/v1/badge.routes.js";

const app = express();

// Restrict CORS to frontend domain for security
app.use(
  cors({
    origin: "https://www.ggithubstreak.com",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

const port = process.env.PORT || 3001;

app.use("/v1", v1Api);
app.use("/badge", badgeRouter);

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
