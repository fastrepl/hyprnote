import { defineLoader } from "vitepress";
import git from "isomorphic-git";
import { Octokit } from "octokit";

import fs from "fs";
import path from "path";

export interface Contributor {
  name: string;
  avatar?: string;
}

declare const data: Contributor[];
export { data };

const getGithubUsers = async () => {
  try {
    const octokit = new Octokit();
    const { data } = await octokit.rest.repos.listContributors({
      owner: "fastrepl",
      repo: "hypr",
      per_page: 100,
      page: 1,
    });
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export default defineLoader({
  async load(): Promise<typeof data> {
    if (process.env.NODE_ENV === "development") {
      return [];
    }

    const githubUsers = await getGithubUsers();

    const base = path.resolve(__dirname, "../../../");

    const log = await git.log({
      fs,
      dir: base,
      ref: "main",
      depth: 5000,
    });

    const contributors = {};
    for (const { commit } of log) {
      const { author } = commit;

      const avatar = `https://github.com/${author.name}.png?size=50`;
      const avatarExists = await fetch(avatar).then(
        (res) => res.status === 200,
      );

      const defaultContributor = {
        name: author.name,
        avatar: avatarExists ? avatar : undefined,
      };

      contributors[author.name] =
        githubUsers.find((user) => user.name === author.name) ??
        defaultContributor;
    }

    return Object.values(contributors);
  },
});
