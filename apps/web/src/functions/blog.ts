import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { env } from "@/env";
import { getSupabaseServerClient } from "@/functions/supabase";

const GITHUB_ORG_REPO = "fastrepl/hyprnote";
const ARTICLES_PATH = "apps/web/content/articles";

const AUTHORS = ["Harshika", "John Jeong", "Yujong Lee"] as const;
const CATEGORIES = [
  "Case Study",
  "Hyprnote Weekly",
  "Productivity Hack",
  "Engineering",
] as const;

function isAllowedEditor(email: string): boolean {
  const allowedEmails = env.BLOG_EDITOR_EMAILS?.split(",").map((e) =>
    e.trim().toLowerCase(),
  );
  if (!allowedEmails || allowedEmails.length === 0) {
    return false;
  }
  return allowedEmails.includes(email.toLowerCase());
}

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Hyprnote-Web",
  };
  if (env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${env.GITHUB_TOKEN}`;
  }
  return headers;
}

function serializeFrontmatter(data: {
  display_title?: string;
  meta_title: string;
  meta_description: string;
  author: string;
  created: string;
  updated?: string;
  coverImage?: string;
  featured?: boolean;
  published: boolean;
  category?: string;
}): string {
  const lines: string[] = ["---"];

  if (data.display_title) {
    lines.push(`display_title: "${data.display_title.replace(/"/g, '\\"')}"`);
  }
  lines.push(`meta_title: "${data.meta_title.replace(/"/g, '\\"')}"`);
  lines.push(
    `meta_description: "${data.meta_description.replace(/"/g, '\\"')}"`,
  );
  lines.push(`author: "${data.author}"`);
  lines.push(`created: "${data.created}"`);
  if (data.updated) {
    lines.push(`updated: "${data.updated}"`);
  }
  if (data.coverImage) {
    lines.push(`coverImage: "${data.coverImage}"`);
  }
  if (data.featured !== undefined) {
    lines.push(`featured: ${data.featured}`);
  }
  lines.push(`published: ${data.published}`);
  if (data.category) {
    lines.push(`category: "${data.category}"`);
  }

  lines.push("---");
  return lines.join("\n");
}

const articleSchema = z.object({
  slug: z.string().min(1),
  display_title: z.string().optional(),
  meta_title: z.string().min(1),
  meta_description: z.string().min(1),
  author: z.enum(AUTHORS),
  created: z.string(),
  updated: z.string().optional(),
  coverImage: z.string().optional(),
  featured: z.boolean().optional(),
  published: z.boolean(),
  category: z.enum(CATEGORIES).optional(),
  content: z.string(),
});

export const checkBlogEditorAccess = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();

    if (!data.user?.email) {
      return { allowed: false, reason: "not_authenticated" };
    }

    if (!isAllowedEditor(data.user.email)) {
      return { allowed: false, reason: "not_authorized" };
    }

    return { allowed: true, email: data.user.email };
  },
);

export const getArticleForEdit = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data: { slug } }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user?.email || !isAllowedEditor(userData.user.email)) {
      return { error: true as const, message: "Unauthorized" };
    }

    const filePath = `${ARTICLES_PATH}/${slug}.mdx`;
    const url = `https://api.github.com/repos/${GITHUB_ORG_REPO}/contents/${filePath}`;

    const response = await fetch(url, { headers: getGitHubHeaders() });

    if (!response.ok) {
      if (response.status === 404) {
        return { error: true as const, message: "Article not found" };
      }
      return { error: true as const, message: "Failed to fetch article" };
    }

    const fileData = await response.json();
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      return { error: true as const, message: "Invalid article format" };
    }

    const frontmatterStr = frontmatterMatch[1];
    const body = frontmatterMatch[2];

    const frontmatter: Record<string, string | boolean> = {};
    frontmatterStr.split("\n").forEach((line) => {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1];
        let value: string | boolean = match[2];
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/\\"/g, '"');
        } else if (value === "true") {
          value = true;
        } else if (value === "false") {
          value = false;
        }
        frontmatter[key] = value;
      }
    });

    return {
      success: true as const,
      article: {
        slug,
        sha: fileData.sha,
        ...frontmatter,
        content: body.trim(),
      },
    };
  });

export const saveArticle = createServerFn({ method: "POST" })
  .inputValidator(
    articleSchema.extend({
      sha: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user?.email || !isAllowedEditor(userData.user.email)) {
      return { error: true as const, message: "Unauthorized" };
    }

    if (!env.GITHUB_TOKEN) {
      return { error: true as const, message: "GitHub token not configured" };
    }

    const frontmatter = serializeFrontmatter({
      display_title: data.display_title,
      meta_title: data.meta_title,
      meta_description: data.meta_description,
      author: data.author,
      created: data.created,
      updated: data.updated || new Date().toISOString().split("T")[0],
      coverImage: data.coverImage,
      featured: data.featured,
      published: data.published,
      category: data.category,
    });

    const fileContent = `${frontmatter}\n\n${data.content}\n`;
    const filePath = `${ARTICLES_PATH}/${data.slug}.mdx`;
    const url = `https://api.github.com/repos/${GITHUB_ORG_REPO}/contents/${filePath}`;

    const body: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message: data.sha
        ? `Update article: ${data.slug}`
        : `Create article: ${data.slug}`,
      content: Buffer.from(fileContent).toString("base64"),
      branch: "main",
    };

    if (data.sha) {
      body.sha = data.sha;
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...getGitHubHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: true as const,
        message: errorData.message || "Failed to save article",
      };
    }

    const result = await response.json();

    return {
      success: true as const,
      sha: result.content.sha,
      message: data.sha ? "Article updated" : "Article created",
    };
  });

export const uploadBlogImage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string(),
      fileName: z.string(),
      fileType: z.string(),
      fileData: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user?.email || !isAllowedEditor(userData.user.email)) {
      return { error: true as const, message: "Unauthorized" };
    }

    const sanitizedFileName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `blog/${data.slug}/${Date.now()}-${sanitizedFileName}`;
    const fileBuffer = Buffer.from(data.fileData, "base64");

    const { error } = await supabase.storage
      .from("public_images")
      .upload(filePath, fileBuffer, {
        contentType: data.fileType,
      });

    if (error) {
      return { error: true as const, message: error.message };
    }

    return {
      success: true as const,
      url: `/api/images/${filePath}`,
    };
  });

export const listArticles = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user?.email || !isAllowedEditor(userData.user.email)) {
      return { error: true as const, message: "Unauthorized" };
    }

    const url = `https://api.github.com/repos/${GITHUB_ORG_REPO}/contents/${ARTICLES_PATH}`;
    const response = await fetch(url, { headers: getGitHubHeaders() });

    if (!response.ok) {
      return { error: true as const, message: "Failed to fetch articles" };
    }

    const files = await response.json();
    const articles = files
      .filter(
        (f: { name: string; type: string }) =>
          f.type === "file" && f.name.endsWith(".mdx"),
      )
      .map((f: { name: string }) => ({
        slug: f.name.replace(/\.mdx$/, ""),
        name: f.name,
      }));

    return { success: true as const, articles };
  },
);
