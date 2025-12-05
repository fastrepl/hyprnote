import { createServerFn } from "@tanstack/react-start";

import { env } from "../env";

const GITHUB_ORG_REPO = "fastrepl/hyprnote";
const CACHE_TTL_MS = 1000 * 60 * 60;

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Hyprnote-Web",
  };
  if (env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${env.GITHUB_TOKEN}`;
  }
  return headers;
}

interface StatsCache {
  data: { stars: number; forks: number };
  timestamp: number;
}

let statsCache: StatsCache | null = null;

export const getGitHubStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const now = Date.now();

    if (statsCache && now - statsCache.timestamp < CACHE_TTL_MS) {
      return statsCache.data;
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG_REPO}`,
        { headers: getGitHubHeaders() },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch repo info: ${response.status}`);
      }

      const data = await response.json();
      const result = {
        stars: data.stargazers_count ?? 0,
        forks: data.forks_count ?? 0,
      };

      statsCache = { data: result, timestamp: now };
      return result;
    } catch {
      if (statsCache) {
        return statsCache.data;
      }
      return { stars: 0, forks: 0 };
    }
  },
);

interface StargazerCache {
  data: { username: string; avatar: string }[];
  timestamp: number;
}

let stargazerCache: StargazerCache | null = null;

export const getStargazers = createServerFn({ method: "GET" }).handler(
  async () => {
    const now = Date.now();

    if (stargazerCache && now - stargazerCache.timestamp < CACHE_TTL_MS) {
      return stargazerCache.data;
    }

    try {
      const headers = getGitHubHeaders();
      const repoResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG_REPO}`,
        { headers },
      );

      if (!repoResponse.ok) {
        throw new Error(`Failed to fetch repo info: ${repoResponse.status}`);
      }

      const repoData = await repoResponse.json();
      const totalStars = repoData.stargazers_count ?? 0;

      if (totalStars === 0) {
        return [];
      }

      const count = 512;
      const perPage = 100;
      const numPages = Math.ceil(Math.min(count, totalStars) / perPage);
      const lastPage = Math.ceil(totalStars / perPage);
      const startPage = Math.max(1, lastPage - numPages + 1);

      const fetchPromises = [];
      for (let page = startPage; page <= lastPage; page++) {
        fetchPromises.push(
          fetch(
            `https://api.github.com/repos/${GITHUB_ORG_REPO}/stargazers?per_page=${perPage}&page=${page}`,
            { headers },
          ),
        );
      }

      const responses = await Promise.all(fetchPromises);
      const allStargazers: { username: string; avatar: string }[] = [];

      for (const response of responses) {
        if (!response.ok) continue;
        const data = await response.json();
        for (const user of data) {
          allStargazers.push({
            username: user.login,
            avatar: user.avatar_url,
          });
        }
      }

      const result = allStargazers.reverse().slice(0, count);

      stargazerCache = {
        data: result,
        timestamp: now,
      };

      return result;
    } catch {
      if (stargazerCache) {
        return stargazerCache.data;
      }
      return [];
    }
  },
);
