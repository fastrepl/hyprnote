import { useQuery } from "@tanstack/react-query";

const ORG_REPO = "fastrepl/hyprnote";
const LAST_SEEN_STARS = 6419;
const LAST_SEEN_FORKS = 396;

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

export function useGitHubStargazers(count: number = 100) {
  return useQuery({
    queryKey: ["github-stargazers", count],
    queryFn: async (): Promise<Stargazer[]> => {
      try {
        const repoResponse = await fetch(
          `https://api.github.com/repos/${ORG_REPO}`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
            },
          },
        );
        if (!repoResponse.ok) {
          console.error(
            `Failed to fetch repo info: ${repoResponse.status} ${repoResponse.statusText}`,
          );
          return [];
        }
        const repoData = await repoResponse.json();
        const totalStars = repoData.stargazers_count ?? LAST_SEEN_STARS;

        if (totalStars === 0) {
          return [];
        }

        const perPage = Math.min(count, 100);
        const lastPage = Math.ceil(totalStars / perPage);

        const response = await fetch(
          `https://api.github.com/repos/${ORG_REPO}/stargazers?per_page=${perPage}&page=${lastPage}`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
            },
          },
        );
        if (!response.ok) {
          console.error(
            `Failed to fetch stargazers: ${response.status} ${response.statusText}`,
          );
          return [];
        }
        const data = await response.json();
        const stargazers = data.map(
          (user: { login: string; avatar_url: string }) => ({
            username: user.login,
            avatar: user.avatar_url,
          }),
        );
        return stargazers.reverse();
      } catch (error) {
        console.error("Error fetching stargazers:", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 60,
  });
}

export const GITHUB_ORG_REPO = ORG_REPO;
export const GITHUB_LAST_SEEN_STARS = LAST_SEEN_STARS;
export const GITHUB_LAST_SEEN_FORKS = LAST_SEEN_FORKS;
