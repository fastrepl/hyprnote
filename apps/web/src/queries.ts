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
  const response = await fetch(
    `https://api.github.com/repos/${ORG_REPO}/stargazers?per_page=100`,
  );
  if (!response.ok) return [];
  const data = await response.json();
  return data.map((user: { login: string; avatar_url: string }) => ({
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
