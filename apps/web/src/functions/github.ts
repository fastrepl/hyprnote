import { createServerFn } from "@tanstack/react-start";

import { env } from "../env";

const GITHUB_ORG_REPO = "fastrepl/anarlog";
const GITHUB_REPO_URL = `https://github.com/${GITHUB_ORG_REPO}`;
const GITHUB_REPO_API_URL = `https://api.github.com/repos/${GITHUB_ORG_REPO}`;
const CACHE_TTL = 60 * 60 * 1000;

type GitHubStats = {
  stars: number | null;
  forks: number | null;
};

function getGitHubHeaders(accept = "application/vnd.github+json") {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "Anarlog-Web",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchGitHub(url: string, accept?: string): Promise<Response> {
  return fetch(url, { headers: getGitHubHeaders(accept) });
}

function parseGitHubCounter(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function extractGitHubCounter(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const value = parseGitHubCounter(pattern.exec(html)?.[1]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

async function fetchGitHubStatsFromApi(): Promise<GitHubStats | null> {
  try {
    const response = await fetchGitHub(GITHUB_REPO_API_URL);

    if (!response.ok) {
      console.error("Failed to fetch GitHub repo stats:", response.status);
      return null;
    }

    const data = (await response.json()) as {
      stargazers_count?: unknown;
      forks_count?: unknown;
    };

    const stars =
      typeof data.stargazers_count === "number" ? data.stargazers_count : null;
    const forks =
      typeof data.forks_count === "number" ? data.forks_count : null;

    if (stars === null || forks === null) {
      console.error(
        "GitHub repo stats response did not include numeric counts",
      );
      return null;
    }

    return { stars, forks };
  } catch (error) {
    console.error("Failed to fetch GitHub repo stats from API:", error);
    return null;
  }
}

async function fetchGitHubStatsFromRepoPage(): Promise<GitHubStats | null> {
  try {
    const response = await fetchGitHub(
      GITHUB_REPO_URL,
      "text/html,application/xhtml+xml",
    );

    if (!response.ok) {
      console.error("Failed to fetch GitHub repo page:", response.status);
      return null;
    }

    const html = await response.text();
    const stars = extractGitHubCounter(html, [
      /id="repo-stars-counter-star"[^>]*title="([^"]+)"/,
      /id="repo-stars-counter-star"[^>]*aria-label="([0-9,]+)\s+users starred this repository"/,
    ]);
    const forks = extractGitHubCounter(html, [
      /id="repo-network-counter"[^>]*title="([^"]+)"/,
      /href="\/fastrepl\/anarlog\/forks"[\s\S]{0,250}?<strong>([0-9,]+)<\/strong>/,
    ]);

    if (stars === null || forks === null) {
      console.error("Failed to parse GitHub repo counts from repo page");
      return null;
    }

    return { stars, forks };
  } catch (error) {
    console.error("Failed to fetch GitHub repo stats from repo page:", error);
    return null;
  }
}

let cachedStats: { value: GitHubStats; expiresAt: number } | undefined;

export const getGitHubStats = createServerFn({ method: "GET" }).handler(
  async () => {
    if (cachedStats && cachedStats.expiresAt > Date.now())
      return cachedStats.value;
    const value =
      (await fetchGitHubStatsFromApi()) ??
      (await fetchGitHubStatsFromRepoPage());
    if (value) cachedStats = { value, expiresAt: Date.now() + CACHE_TTL };
    return value ?? { stars: null, forks: null };
  },
);
