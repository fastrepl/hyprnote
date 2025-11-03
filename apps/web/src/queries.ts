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

export const GITHUB_ORG_REPO = ORG_REPO;
export const GITHUB_LAST_SEEN_STARS = LAST_SEEN_STARS;
export const GITHUB_LAST_SEEN_FORKS = LAST_SEEN_FORKS;
