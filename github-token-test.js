import { Octokit } from "octokit";

const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("GITHUB_TOKEN is not set!");
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

async function test() {
  try {
    const { data } = await octokit.request("GET /user");
    console.log("Token is valid! Authenticated as:", data.login);
  } catch (e) {
    console.error("Token test failed:", e.message);
    if (e.response) {
      console.error("Status:", e.response.status);
      console.error("Data:", e.response.data);
    }
    process.exit(1);
  }
}

test();
