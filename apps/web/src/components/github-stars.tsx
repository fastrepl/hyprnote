import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";

import { GITHUB_LAST_SEEN_STARS, GITHUB_ORG_REPO, useGitHubStats } from "../queries";

export function GithubStars() {
  const githubStats = useGitHubStats();
  const starCount = githubStats.data?.stars ?? GITHUB_LAST_SEEN_STARS;
  const render = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}k` : n;

  return (
    <a href={`https://github.com/${GITHUB_ORG_REPO}`} target="_blank">
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
