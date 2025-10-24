import { Icon } from "@iconify-icon/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/_layout/")({
  component: Component,
});

function Component() {
  return (
    <div className="flex flex-col justify-center items-center h-screen gap-8">
      <Hero />

      <div className="flex gap-4">
        <DownloadButton />
        <GithubStars />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <h1 className="font-mono text-4xl text-center">
      AI notetaker that feels good
    </h1>
  );
}

function DownloadButton() {
  return (
    <button
      className={cn([
        "px-4 py-2",
        "bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium",
        "cursor-pointer",
      ])}
    >
      Download now
    </button>
  );
}

function GithubStars() {
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

  const render = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}k+` : n;

  return (
    <button
      className={cn([
        "px-4 py-2",
        "flex items-center gap-2 font-light cursor-pointer",
        "border border-gray-300 rounded-lg hover:bg-gray-50",
      ])}
      onClick={() => window.open(`https://github.com/${ORG_REPO}`, "_blank")}
    >
      <Icon icon="mdi:github" />
      <span>Source</span>
      <span className="text-xs text-neutral-500 mt-1">
        {star.data ? render(star.data) : render(LAST_SEEN)}
      </span>
    </button>
  );
}
