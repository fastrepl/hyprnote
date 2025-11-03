import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { useQuery } from "@tanstack/react-query";

export function GithubStars() {
  const LAST_SEEN_STARS = 6400;
  const LAST_SEEN_FORKS = 396;
  const ORG_REPO = "fastrepl/hyprnote";

  const githubStats = useQuery({
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

  const render = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}k` : n;

  const starCount = githubStats.data?.stars ?? LAST_SEEN_STARS;

  return (
    <a href={`https://github.com/${ORG_REPO}`} target="_blank">
      <button
        className={cn([
          "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
          "bg-linear-to-t from-neutral-800 to-neutral-700 text-white rounded-full",
          "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
          "transition-all cursor-pointer",
        ])}
      >
        <Icon icon="mdi:github" className="text-xl" />
        <span className="ml-2">{render(starCount)} stars</span>
      </button>
    </a>
  );
}
