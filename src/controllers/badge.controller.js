import { generateBadge } from "../services/badge.service.js";

export const getBadge = async (req, res) => {
  const { username } = req.params;
  const { style = "flat", theme = "dark" } = req.query;

  if (!username || typeof username !== "string" || username.trim() === "") {
    res.status(400).json({ error: "Invalid username" });
    return;
  }

  try {
    const svg = await generateBadge(username, { style, theme });

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(svg);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
};
