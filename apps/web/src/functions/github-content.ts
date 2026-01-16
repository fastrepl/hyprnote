import * as fs from "fs";
import * as path from "path";

import { getSupabaseServerClient } from "@/functions/supabase";

const GITHUB_REPO = "fastrepl/hyprnote";
const GITHUB_BRANCH = "main";
const CONTENT_PATH = "apps/web/content";

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function getLocalContentPath(): string {
  return path.resolve(process.cwd(), "content");
}

const VALID_FOLDERS = [
  "articles",
  "changelog",
  "docs",
  "handbook",
  "legal",
  "templates",
];

const GITHUB_USERNAME_TO_AUTHOR: Record<
  string,
  { name: string; email: string }
> = {
  yujonglee: { name: "Yujong Lee", email: "yujonglee@hyprnote.com" },
  ComputelessComputer: { name: "John Jeong", email: "john@hyprnote.com" },
};

interface GitHubCredentials {
  token: string;
  author?: { name: string; email: string };
}

interface CommitBody {
  message: string;
  content?: string;
  sha?: string;
  branch: string;
  author?: { name: string; email: string };
  committer?: { name: string; email: string };
}

function buildCommitBody(
  message: string,
  author?: { name: string; email: string },
  options?: { content?: string; sha?: string },
): CommitBody {
  const body: CommitBody = {
    message,
    branch: GITHUB_BRANCH,
  };
  if (options?.content !== undefined) body.content = options.content;
  if (options?.sha) body.sha = options.sha;
  if (author) {
    body.author = author;
    body.committer = author;
  }
  return body;
}

async function getGitHubCredentials(): Promise<GitHubCredentials | undefined> {
  const supabase = getSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user?.id) {
    return undefined;
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("github_token, github_username")
    .eq("id", userData.user.id)
    .single();

  if (!admin?.github_token) {
    return undefined;
  }

  const author = admin.github_username
    ? GITHUB_USERNAME_TO_AUTHOR[admin.github_username]
    : undefined;

  return { token: admin.github_token, author };
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

  const defaultContent = content || getDefaultFrontmatter(folder);

  if (isDev()) {
    try {
      const localPath = path.join(getLocalContentPath(), folder, safeFilename);
      if (fs.existsSync(localPath)) {
        return {
          success: false,
          error: `File already exists: ${safeFilename}`,
        };
      }
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localPath, defaultContent);
      return { success: true, path: `${folder}/${safeFilename}` };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create file locally: ${(error as Error).message}`,
      };
    }
  }

  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return { success: false, error: "GitHub token not configured" };
  }
  const { token: githubToken, author } = credentials;

  const filePath = getFullPath(folder, safeFilename);

  try {
    const checkResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
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
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildCommitBody(
            `Create ${folder}/${safeFilename} via admin`,
            author,
            {
              content: contentBase64,
            },
          ),
        ),
      },
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      return {
        success: false,
        error: error.message || `GitHub API error: ${createResponse.status}`,
      };
    }

    return { success: true, path: `${folder}/${safeFilename}` };
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
  if (!VALID_FOLDERS.includes(parentFolder)) {
    return {
      success: false,
      error: `Invalid parent folder. Must be one of: ${VALID_FOLDERS.join(", ")}`,
    };
  }

  const sanitizedFolderName = folderName
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .toLowerCase();

  if (isDev()) {
    try {
      const localPath = path.join(
        getLocalContentPath(),
        parentFolder,
        sanitizedFolderName,
      );
      if (fs.existsSync(localPath)) {
        return {
          success: false,
          error: `Folder already exists: ${sanitizedFolderName}`,
        };
      }
      fs.mkdirSync(localPath, { recursive: true });
      return {
        success: true,
        path: `${parentFolder}/${sanitizedFolderName}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create folder locally: ${(error as Error).message}`,
      };
    }
  }

  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return { success: false, error: "GitHub token not configured" };
  }
  const { token: githubToken, author } = credentials;

  const folderPath = `${CONTENT_PATH}/${parentFolder}/${sanitizedFolderName}/.gitkeep`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${folderPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify(
          buildCommitBody(
            `Create folder ${parentFolder}/${sanitizedFolderName} via admin`,
            author,
            { content: "" },
          ),
        ),
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
      path: `${parentFolder}/${sanitizedFolderName}`,
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
  if (isDev()) {
    try {
      const localFromPath = path.join(getLocalContentPath(), fromPath);
      const localToPath = path.join(getLocalContentPath(), toPath);

      if (!fs.existsSync(localFromPath)) {
        return { success: false, error: `Source file not found: ${fromPath}` };
      }
      if (fs.existsSync(localToPath)) {
        return {
          success: false,
          error: `Target file already exists: ${toPath}`,
        };
      }

      const dir = path.dirname(localToPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.renameSync(localFromPath, localToPath);
      return { success: true, newPath: toPath };
    } catch (error) {
      return {
        success: false,
        error: `Failed to rename file locally: ${(error as Error).message}`,
      };
    }
  }

  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return { success: false, error: "GitHub token not configured" };
  }
  const { token: githubToken, author } = credentials;

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
        body: JSON.stringify(
          buildCommitBody(`Rename ${fromPath} to ${toPath} via admin`, author, {
            content,
          }),
        ),
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
        body: JSON.stringify(
          buildCommitBody(
            `Rename ${fromPath} to ${toPath} via admin (delete original)`,
            author,
            { sha },
          ),
        ),
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
  filePath: string,
): Promise<{ success: boolean; error?: string }> {
  if (isDev()) {
    try {
      const localPath = path.join(getLocalContentPath(), filePath);
      if (!fs.existsSync(localPath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }
      fs.unlinkSync(localPath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete file locally: ${(error as Error).message}`,
      };
    }
  }

  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return { success: false, error: "GitHub token not configured" };
  }
  const { token: githubToken, author } = credentials;

  const fullPath = filePath.startsWith("apps/web/content")
    ? filePath
    : `${CONTENT_PATH}/${filePath}`;

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
        body: JSON.stringify(
          buildCommitBody(`Delete ${filePath} via admin`, author, { sha }),
        ),
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

export async function updateContentFile(
  filePath: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  if (isDev()) {
    try {
      const localPath = path.join(getLocalContentPath(), filePath);
      if (!fs.existsSync(localPath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }
      fs.writeFileSync(localPath, content);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update file locally: ${(error as Error).message}`,
      };
    }
  }

  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return { success: false, error: "GitHub token not configured" };
  }
  const { token: githubToken, author } = credentials;

  const fullPath = filePath.startsWith("apps/web/content")
    ? filePath
    : `${CONTENT_PATH}/${filePath}`;

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

    const contentBase64 = Buffer.from(content).toString("base64");

    const updateResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${fullPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify(
          buildCommitBody(`Update ${filePath} via admin`, author, {
            content: contentBase64,
            sha,
          }),
        ),
      },
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      return {
        success: false,
        error: `Failed to update: ${error.message || updateResponse.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Update failed: ${(error as Error).message}`,
    };
  }
}

export async function duplicateContentFile(
  sourcePath: string,
  newFilename?: string,
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (isDev()) {
    try {
      const localSourcePath = path.join(getLocalContentPath(), sourcePath);

      if (!fs.existsSync(localSourcePath)) {
        return {
          success: false,
          error: `Source file not found: ${sourcePath}`,
        };
      }

      const pathParts = sourcePath.split("/");
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
      const localTargetPath = path.join(getLocalContentPath(), targetPath);

      if (fs.existsSync(localTargetPath)) {
        return {
          success: false,
          error: `File already exists: ${targetFilename}`,
        };
      }

      const content = fs.readFileSync(localSourcePath);
      fs.writeFileSync(localTargetPath, content);

      return { success: true, path: targetPath };
    } catch (error) {
      return {
        success: false,
        error: `Failed to duplicate file locally: ${(error as Error).message}`,
      };
    }
  }

  const credentials = await getGitHubCredentials();
  if (!credentials) {
    return { success: false, error: "GitHub token not configured" };
  }
  const { token: githubToken, author } = credentials;

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
        body: JSON.stringify(
          buildCommitBody(
            `Duplicate ${sourcePath} as ${targetFilename} via admin`,
            author,
            { content },
          ),
        ),
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
