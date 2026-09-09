import { useQuery } from "@tanstack/react-query";
// @ts-ignore virtual module provided by the Vite changelog plugin
import { latestContent, latestVersion } from "virtual:changelog";

import { processContent } from "@anlg/changelog";

import { changelogUrl } from "./source";

export function useChangelogContent(version: string) {
  const query = useQuery({
    queryKey: ["changelog", version],
    queryFn: async ({ signal }) => {
      if (version === latestVersion && latestContent)
        return latestContent as string;
      const url = changelogUrl(version);
      if (!url) return null;
      const response = await fetch(url, { signal });
      if (!response.ok) return null;
      if (version.includes("-nightly.")) {
        const release = await response.json();
        return typeof release.body === "string" ? release.body : null;
      }
      return response.text();
    },
    staleTime: Infinity,
  });
  const parsed = query.data ? processContent(query.data) : null;
  return {
    content: parsed?.content ?? null,
    date: parsed?.date ?? null,
    loading: query.isPending,
  };
}
