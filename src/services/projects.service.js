import { Octokit } from "octokit";
import { communityProjects } from "../utils/constants.js";

/**
 * Retrieves the list of contributors for current community projects
 */
export const fetchContributors = async () => {
  const octokit = new Octokit();

  const contributorsPromise = communityProjects.map((repo) =>
    octokit.request("GET /repos/{owner}/{repo}/contributors", {
      repo,
      owner: "Githubstreak",
    }),
  );

  const contributorsRes = await Promise.all(contributorsPromise);

  const contributorsMerged = contributorsRes.map((res) => res.data).flat();

  const contributors = contributorsMerged.map((data) => ({
    login: data.login,
    contributions: contributorsMerged
      .filter((contributor) => contributor.login === data.login)
      .reduce((acc, contributor) => acc + contributor.contributions, 0),
    avatarUrl: data.avatar_url,
  }));

  // Remove duplicated counts
  const filteredContributors = [
    ...new Set(contributors.map(JSON.stringify)),
  ].map(JSON.parse);

  return filteredContributors;
};
