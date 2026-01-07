/* ADVANCED FEATURES DISABLED FOR DEBUGGING
Analytics, advanced filtering, notifications, premium endpoints, complex queries are temporarily disabled.
To restore, remove this comment block and uncomment the relevant code in services and controllers.
*/
import { Octokit } from "octokit";
import { communityProjects } from "../utils/constants.js";
import Project from "../models/project.model.js";

/**
 * Retrieves the list of contributors for current community projects
 */
export const fetchContributors = async () => {
  const octokit = new Octokit();

  const contributorsPromise = communityProjects.map((repo) =>
    octokit.request("GET /repos/{owner}/{repo}/contributors", {
      repo,
      owner: "Githubstreak",
    })
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

/**
 * Parse GitHub URL to extract owner and repo
 */
export const parseGitHubUrl = (url) => {
  const patterns = [
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/,
    /^https?:\/\/www\.github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/,
    /^github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
    }
  }

  return null;
};

/**
 * Fetch repository data from GitHub API
 */
export const fetchGitHubRepoData = async (owner, repo) => {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN, // Optional: for higher rate limits
  });

  try {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    return {
      name: data.name,
      owner: data.owner.login,
      ownerAvatar: data.owner.avatar_url,
      description: data.description || "",
      repoUrl: data.html_url,
      homepage: data.homepage || "",
      projectLanguage: data.language || "",
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.watchers_count,
      topics: data.topics || [],
    };
  } catch (error) {
    if (error.status === 404) {
      const err = new Error("Repository not found on GitHub");
      err.code = "REPO_NOT_FOUND";
      throw err;
    }
    if (error.status === 403) {
      const err = new Error("GitHub API rate limit exceeded. Try again later.");
      err.code = "RATE_LIMITED";
      throw err;
    }
    throw error;
  }
};

/**
 * Get all projects with filtering and pagination
 */
export const getProjects = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    projectLanguage,
    lookingForContributors,
    search,
  } = options;

  const query = {};

  // Filter by projectLanguage
  if (projectLanguage) {
    query.projectLanguage = { $regex: new RegExp(`^${projectLanguage}$`, "i") };
  }

  // Filter by looking for contributors
  if (lookingForContributors !== undefined) {
    query.lookingForContributors =
      lookingForContributors === "true" || lookingForContributors === true;
  }

  // Search in name, description, owner, techStack
    /* ADVANCED FEATURE DISABLED: Analytics, advanced filtering, notifications, premium endpoints, complex queries
    // Analytics, advanced filtering, notifications, premium endpoints, and complex queries are temporarily disabled for debugging.
    // To restore, remove this comment block and uncomment the relevant code below.
    */
    // Filter by projectLanguage
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { owner: { $regex: search, $options: "i" } },
      { techStack: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const [projects, total] = await Promise.all([
    Project.find(query)
      .sort({ stars: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Project.countDocuments(query),
  ]);

  return {
    projects,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limitNum),
  };
};

/**
 * Get project by ID
 */
export const getProjectById = async (id) => {
  const project = await Project.findById(id).lean();
  return project;
};

/**
 * Create a new project
 */
export const createProject = async (userId, repoUrl, customData = {}) => {
  // Parse GitHub URL
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    const err = new Error("Invalid GitHub repository URL");
    err.code = "INVALID_URL";
    throw err;
  }

  // Check for duplicate
  const existing = await Project.findOne({
    repoUrl: {
      $regex: new RegExp(`github\\.com/${parsed.owner}/${parsed.repo}`, "i"),
    },
  });
  if (existing) {
    const err = new Error("This repository has already been submitted");
    err.code = "DUPLICATE_PROJECT";
    throw err;
  }

  // Fetch GitHub data
  const githubData = await fetchGitHubRepoData(parsed.owner, parsed.repo);

  // Create project
  const projectData = {
    ...githubData,
    description: customData.description || githubData.description,
    techStack: customData.techStack || [],
    lookingForContributors: customData.lookingForContributors || false,
    submittedBy: userId,
  };

  const project = new Project(projectData);
  await project.save();

  return project.toObject();
};

/**
 * Update a project
 */
export const updateProject = async (id, userId, updates) => {
  const project = await Project.findById(id);

  if (!project) {
    const err = new Error("Project not found");
    err.code = "PROJECT_NOT_FOUND";
    throw err;
  }

  if (project.submittedBy !== userId) {
    const err = new Error("You can only update your own projects");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  // Only allow updating specific fields
  const allowedUpdates = ["description", "techStack", "lookingForContributors"];
  const filteredUpdates = {};

  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  Object.assign(project, filteredUpdates);
  await project.save();

  return project.toObject();
};

/**
 * Delete a project
 */
export const deleteProject = async (id, userId) => {
  const project = await Project.findById(id);

  if (!project) {
    const err = new Error("Project not found");
    err.code = "PROJECT_NOT_FOUND";
    throw err;
  }

  if (project.submittedBy !== userId) {
    const err = new Error("You can only delete your own projects");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  await Project.findByIdAndDelete(id);

  return { success: true };
};

/**
 * Refresh GitHub stats for a project
 */
export const refreshProjectStats = async (id) => {
  const project = await Project.findById(id);

  if (!project) {
    const err = new Error("Project not found");
    err.code = "PROJECT_NOT_FOUND";
    throw err;
  }

  const parsed = parseGitHubUrl(project.repoUrl);
  if (!parsed) {
    const err = new Error("Invalid repository URL stored");
    err.code = "INVALID_URL";
    throw err;
  }

  const githubData = await fetchGitHubRepoData(parsed.owner, parsed.repo);

  // Update only GitHub-sourced fields
  project.stars = githubData.stars;
  project.forks = githubData.forks;
  project.watchers = githubData.watchers;
  project.topics = githubData.topics;
  project.projectLanguage = githubData.language;
  project.ownerAvatar = githubData.ownerAvatar;

  await project.save();

  return project.toObject();
};

/**
 * Get projects by user
 */
export const getProjectsByUser = async (userId) => {
  const projects = await Project.find({ submittedBy: userId })
    .sort({ createdAt: -1 })
    .lean();
  return projects;
};
