import { createFileRoute } from "@tanstack/react-router";

import { fetchAdminUser } from "@/functions/admin";
import { updateContentFile } from "@/functions/github-content";

interface ArticleMetadata {
  meta_title?: string;
  display_title?: string;
  meta_description?: string;
  author?: string;
  date?: string;
  coverImage?: string;
  published?: boolean;
  featured?: boolean;
  category?: string;
}

interface SaveRequest {
  path: string;
  content: string;
  metadata: ArticleMetadata;
}

function buildFrontmatter(metadata: ArticleMetadata): string {
  const lines: string[] = ["---"];

  if (metadata.meta_title) {
    lines.push(`meta_title: "${metadata.meta_title}"`);
  }
  if (metadata.display_title) {
    lines.push(`display_title: "${metadata.display_title}"`);
  }
  if (metadata.meta_description) {
    lines.push(`meta_description: "${metadata.meta_description}"`);
  }
  if (metadata.author) {
    lines.push(`author: "${metadata.author}"`);
  }
  if (metadata.coverImage) {
    lines.push(`coverImage: "${metadata.coverImage}"`);
  }
  if (metadata.published !== undefined) {
    lines.push(`published: ${metadata.published}`);
  }
  if (metadata.featured !== undefined) {
    lines.push(`featured: ${metadata.featured}`);
  }
  if (metadata.date) {
    lines.push(`date: "${metadata.date}"`);
  }
  if (metadata.category) {
    lines.push(`category: "${metadata.category}"`);
  }

  lines.push("---");
  return lines.join("\n");
}

export const Route = createFileRoute("/api/admin/content/save")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const isDev = process.env.NODE_ENV === "development";
        if (!isDev) {
          const user = await fetchAdminUser();
          if (!user?.isAdmin) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        let body: SaveRequest;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { path, content, metadata } = body;

        if (!path || content === undefined || !metadata) {
          return new Response(
            JSON.stringify({
              error: "Missing required fields: path, content, metadata",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const frontmatter = buildFrontmatter(metadata);
        const fullContent = `${frontmatter}\n\n${content}`;

        const result = await updateContentFile(path, fullContent);

        if (!result.success) {
          return new Response(JSON.stringify({ error: result.error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
