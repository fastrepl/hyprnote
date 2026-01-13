import { env } from "@/env";

const GITHUB_REPO = "fastrepl/hyprnote";
const GITHUB_BRANCH = "main";
const CONTENT_PATH = "apps/web/content";

const VALID_FOLDERS = [
  "articles",
  "changelog",
  "docs",
  "handbook",
  "legal",
  "templates",
];

function getGitHubToken(): string | undefined {
  return env.YUJONGLEE_GITHUB_TOKEN_REPO;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9-_.]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function getFullPath(folder: string, filename: string): string {
  return `${CONTENT_PATH}/${folder}/${filename}`;
}

function getDefaultFrontmatter(folder: string): string {
  const today = new Date().toISOString().split("T")[0];

  switch (folder) {
    case "articles":
      return `---
meta_title: ""
meta_description: ""
author: "John Jeong"
date: "${today}"
published: false
---

`;
    case "changelog":
      return `---
date: "${today}"
---

`;
    case "docs":
      return `---
title: ""
section: ""
---

`;
    case "handbook":
      return `---
title: ""
section: ""
---

`;
    case "legal":
      return `---
title: ""
summary: ""
date: "${today}"
---

`;
    case "templates":
      return `---
title: ""
description: ""
category: ""
targets: []
sections: []
---

`;
    default:
      return `---
title: ""
---

`;
  }
}

export async function createContentFile(
  folder: string,
  filename: string,
  content: string = "",
): Promise<{ success: boolean; path?: string; error?: string }> {
  const githubToken = getGitHubToken();
  if (!githubToken) {
    return { success: false, error: "GitHub token not configured" };
  }

  if (!VALID_FOLDERS.includes(folder)) {
    return {
      success: false,
      error: `Invalid folder. Must be one of: ${VALID_FOLDERS.join(", ")}`,
    };
  }

  let safeFilename = sanitizeFilename(filename);
  if (!safeFilename.endsWith(".mdx")) {
    safeFilename = `${safeFilename}.mdx`;
  }

  const path = getFullPath(folder, safeFilename);

  const defaultContent = content || getDefaultFrontmatter(folder);

  try {
    const checkResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (checkResponse.status === 200) {
      return { success: false, error: `File already exists: ${safeFilename}` };
    }

    const contentBase64 = Buffer.from(defaultContent).toString("base64");

    const createResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Create ${folder}/${safeFilename} via admin`,
          content: contentBase64,
          branch: GITHUB_BRANCH,
        }),
      },
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      return {
        success: false,
        error: error.message || `GitHub API error: ${createResponse.status}`,
      };
    }

    return { success: true, path };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create file: ${(error as Error).message}`,
    };
  }
}

export async function createContentFolder(
  parentFolder: string,
  folderName: string,
): Promise<{ success: boolean; path?: string; error?: string }> {
  const githubToken = getGitHubToken();
  if (!githubToken) {
    return { success: false, error: "GitHub token not configured" };
  }

  if (!VALID_FOLDERS.includes(parentFolder)) {
    return {
      success: false,
      error: `Invalid parent folder. Must be one of: ${VALID_FOLDERS.join(", ")}`,
    };
  }

  const sanitizedFolderName = folderName
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();

  const path = `${CONTENT_PATH}/${parentFolder}/${sanitizedFolderName}/.gitkeep`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Create folder ${parentFolder}/${sanitizedFolderName} via admin`,
          content: "",
          branch: GITHUB_BRANCH,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || `GitHub API error: ${response.status}`,
      };
    }

    return {
      success: true,
      path: `${CONTENT_PATH}/${parentFolder}/${sanitizedFolderName}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create folder: ${(error as Error).message}`,
    };
  }
}

export async function renameContentFile(
  fromPath: string,
  toPath: string,
): Promise<{ success: boolean; newPath?: string; error?: string }> {
  const githubToken = getGitHubToken();
  if (!githubToken) {
    return { success: false, error: "GitHub token not configured" };
  }

  const fullFromPath = fromPath.startsWith("apps/web/content")
    ? fromPath
    : `${CONTENT_PATH}/${fromPath}`;
  const fullToPath = toPath.startsWith("apps/web/content")
    ? toPath
    : `${CONTENT_PATH}/${toPath}`;

  try {
    const getResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullFromPath}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!getResponse.ok) {
      return {
        success: false,
        error: `Source file not found: ${getResponse.status}`,
      };
    }

    const fileData = await getResponse.json();
    const content = fileData.content;
    const sha = fileData.sha;

    const createResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullToPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Rename ${fromPath} to ${toPath} via admin`,
          content,
          branch: GITHUB_BRANCH,
        }),
      },
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      return {
        success: false,
        error: `Failed to create renamed file: ${error.message || createResponse.status}`,
      };
    }

    const deleteResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullFromPath}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Rename ${fromPath} to ${toPath} via admin (delete original)`,
          sha,
          branch: GITHUB_BRANCH,
        }),
      },
    );

    if (!deleteResponse.ok) {
      return {
        success: false,
        error: "File copied but failed to delete original",
      };
    }

    return { success: true, newPath: fullToPath };
  } catch (error) {
    return {
      success: false,
      error: `Rename failed: ${(error as Error).message}`,
    };
  }
}

export async function deleteContentFile(
  path: string,
): Promise<{ success: boolean; error?: string }> {
  const githubToken = getGitHubToken();
  if (!githubToken) {
    return { success: false, error: "GitHub token not configured" };
  }

  const fullPath = path.startsWith("apps/web/content")
    ? path
    : `${CONTENT_PATH}/${path}`;

  try {
    const getResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!getResponse.ok) {
      return {
        success: false,
        error: `File not found: ${getResponse.status}`,
      };
    }

    const fileData = await getResponse.json();
    const sha = fileData.sha;

    const deleteResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Delete ${path} via admin`,
          sha,
          branch: GITHUB_BRANCH,
        }),
      },
    );

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      return {
        success: false,
        error: `Failed to delete: ${error.message || deleteResponse.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Delete failed: ${(error as Error).message}`,
    };
  }
}

export async function duplicateContentFile(
  sourcePath: string,
  newFilename?: string,
): Promise<{ success: boolean; path?: string; error?: string }> {
  const githubToken = getGitHubToken();
  if (!githubToken) {
    return { success: false, error: "GitHub token not configured" };
  }

  const fullSourcePath = sourcePath.startsWith("apps/web/content")
    ? sourcePath
    : `${CONTENT_PATH}/${sourcePath}`;

  try {
    const getResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullSourcePath}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!getResponse.ok) {
      return {
        success: false,
        error: `Source file not found: ${getResponse.status}`,
      };
    }

    const fileData = await getResponse.json();
    const content = fileData.content;

    const pathParts = fullSourcePath.split("/");
    const originalFilename = pathParts.pop() || "";
    const folder = pathParts.join("/");

    let targetFilename: string;
    if (newFilename) {
      targetFilename = sanitizeFilename(newFilename);
      if (!targetFilename.endsWith(".mdx")) {
        targetFilename = `${targetFilename}.mdx`;
      }
    } else {
      const baseName = originalFilename.replace(/\.mdx$/, "");
      targetFilename = `${baseName}-copy.mdx`;
    }

    const targetPath = `${folder}/${targetFilename}`;

    const checkResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${targetPath}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (checkResponse.status === 200) {
      return {
        success: false,
        error: `File already exists: ${targetFilename}`,
      };
    }

    const createResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${targetPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Duplicate ${sourcePath} as ${targetFilename} via admin`,
          content,
          branch: GITHUB_BRANCH,
        }),
      },
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      return {
        success: false,
        error: error.message || `GitHub API error: ${createResponse.status}`,
      };
    }

    return { success: true, path: targetPath };
  } catch (error) {
    return {
      success: false,
      error: `Duplicate failed: ${(error as Error).message}`,
    };
  }
}
