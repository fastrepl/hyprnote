import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";
import { useQuery } from "@tanstack/react-query";

export function GithubStars() {
  const LAST_SEEN = 6400;
  const ORG_REPO = "fastrepl/hyprnote";

  const star = useQuery({
    queryKey: ["github-stars"],
    queryFn: async () => {
      const response = await fetch(`https://api.github.com/repos/${ORG_REPO}`);
      const data = await response.json();
      return data.stargazers_count ?? LAST_SEEN;
    },
  });

  const render = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}k` : n;

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
        <span className="ml-2">{star.data ? render(star.data) : render(LAST_SEEN)} stars</span>
      </button>
    </a>
  );
}
