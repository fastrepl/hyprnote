type VersionChannel = "stable" | "nightly" | "staging";

// https://docs.crabnebula.dev/cloud/cli/upload-assets/#public-platform---public-platform
export type VersionPlatform = "dmg-aarch64";

export type VersionDownloads = Partial<Record<VersionPlatform, string>>;

export type VersionEntry = {
  version: string;
  summary?: string;
  created: string;
  channel: VersionChannel;
  downloads: VersionDownloads;
};

const GITHUB_REPO_OWNER = "fastrepl";
const GITHUB_REPO_NAME = "hyprnote";

type GithubTagResponse = {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
};

type GithubTagInfo = {
  tag: string;
  version: string;
  sha: string;
};

export async function fetchGithubDesktopTags(options?: {
  signal?: AbortSignal;
  token?: string;
}): Promise<GithubTagInfo[]> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
  };

  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/tags?per_page=100`,
    {
      headers,
      signal: options?.signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch GitHub tags: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as GithubTagResponse[];

  return data
    .filter((tag) => tag.name.startsWith("desktop_v"))
    .map((tag) => ({
      tag: tag.name,
      version: tag.name.replace(/^desktop_v/, ""),
      sha: tag.commit.sha,
    }));
}
