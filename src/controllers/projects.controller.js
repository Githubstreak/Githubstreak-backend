import { fetchContributors } from "../services/projects.service.js";
import { cacheTime } from "../utils/constants.js";

export const getContributors = async (_, res) => {
  try {
    const contributors = await fetchContributors();
    res.setHeader(
      "Cache-Control",
      `public, max-age=${cacheTime.BROWSER_CACHE_TIME}`,
    );
    res.json(contributors);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Internal server error" });
  }
};
