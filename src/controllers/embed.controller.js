import {
  generateProfileCard,
  getPublicProfile,
} from "../services/embed.service.js";

export const getEmbedBadge = async (req, res) => {
  const { username } = req.params;
  const { theme = "dark" } = req.query;

  if (!username || typeof username !== "string" || username.trim() === "") {
    return res.status(400).json({
      error: true,
      message: "Invalid username",
      code: "INVALID_USERNAME",
    });
  }

  try {
    const svg = await generateProfileCard(username, theme);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(svg);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};

export const getPublicProfileData = async (req, res) => {
  const { username } = req.params;

  if (!username || typeof username !== "string" || username.trim() === "") {
    return res.status(400).json({
      error: true,
      message: "Invalid username",
      code: "INVALID_USERNAME",
    });
  }

  try {
    const profile = await getPublicProfile(username);

    if (!profile) {
      return res.status(404).json({
        error: true,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.json(profile);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};
