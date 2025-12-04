import { useQuery } from "@tanstack/react-query";

const ORG_REPO = "fastrepl/hyprnote";
const LAST_SEEN_STARS = 7032;
const LAST_SEEN_FORKS = 432;

export function useGitHubStats() {
  return useQuery({
    queryKey: ["github-stats"],
    queryFn: async () => {
      const response = await fetch(`https://api.github.com/repos/${ORG_REPO}`);
      const data = await response.json();
      return {
        stars: data.stargazers_count ?? LAST_SEEN_STARS,
        forks: data.forks_count ?? LAST_SEEN_FORKS,
      };
    },
  });
}

export interface Stargazer {
  username: string;
  avatar: string;
}

async function fetchStargazersFromGitHub(): Promise<Stargazer[]> {
  const firstResponse = await fetch(
    `https://api.github.com/repos/${ORG_REPO}/stargazers?per_page=100`,
  );
  if (!firstResponse.ok) return [];

  const linkHeader = firstResponse.headers.get("Link");
  if (!linkHeader) {
    const data = await firstResponse.json();
    return data.map((user: { login: string; avatar_url: string }) => ({
      username: user.login,
      avatar: user.avatar_url,
    }));
  }

  const lastMatch = linkHeader.match(/<([^>]+)>;\s*rel="last"/);
  if (!lastMatch) {
    const data = await firstResponse.json();
    return data.map((user: { login: string; avatar_url: string }) => ({
      username: user.login,
      avatar: user.avatar_url,
    }));
  }

  const lastPageUrl = new URL(lastMatch[1]);
  const lastPage = parseInt(lastPageUrl.searchParams.get("page") || "1", 10);
  const secondLastPage = Math.max(1, lastPage - 1);

  const [lastResponse, secondLastResponse] = await Promise.all([
    fetch(lastPageUrl.toString()),
    lastPage > 1
      ? fetch(
          `https://api.github.com/repos/${ORG_REPO}/stargazers?per_page=100&page=${secondLastPage}`,
        )
      : Promise.resolve(null),
  ]);

  if (!lastResponse.ok) return [];

  const lastData = await lastResponse.json();
  const secondLastData = secondLastResponse?.ok
    ? await secondLastResponse.json()
    : [];

  const combined = [...secondLastData, ...lastData];
  return combined
    .reverse()
    .slice(0, 200)
    .map((user: { login: string; avatar_url: string }) => ({
      username: user.login,
      avatar: user.avatar_url,
    }));
}

export function useGitHubStargazers() {
  return useQuery({
    queryKey: ["github-stargazers"],
    queryFn: async (): Promise<Stargazer[]> => {
      const response = await fetch("https://api.hyprnote.com/stargazers").catch(
        () => null,
      );
      if (response?.ok) {
        const data = await response.json();
        return data.stargazers;
      }

      return fetchStargazersFromGitHub().catch(() => []);
    },
    staleTime: 1000 * 60 * 60,
  });
}

export const GITHUB_ORG_REPO = ORG_REPO;
export const GITHUB_LAST_SEEN_STARS = LAST_SEEN_STARS;
export const GITHUB_LAST_SEEN_FORKS = LAST_SEEN_FORKS;
