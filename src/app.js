import cors from "cors";
import "dotenv/config";
import express from "express";
import database from "./lib/database.js";
import v1Api from "./routes/index.js";
import badgeRouter from "./routes/v1/badge.routes.js";

const app = express();

// Root endpoint for health check or friendly message
app.get("/", (req, res) => {
  res.send("Githubstreak API is running.");
});

// Restrict CORS to frontend domain for security
app.use(
  cors({
    origin: ["https://www.ggithubstreak.com", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Ensure preflight (OPTIONS) requests receive CORS headers
app.options(
  "*",
  cors({
    origin: ["https://www.ggithubstreak.com", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Fallback CORS headers to cover cases where a proxy or platform strips headers
app.use((req, res, next) => {
  const allowedOrigin =
    process.env.FRONTEND_URL || "https://www.ggithubstreak.com";
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

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
