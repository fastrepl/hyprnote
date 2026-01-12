import { createFileRoute } from "@tanstack/react-router";

import { fetchAdminUser } from "@/functions/admin";

interface ImportRequest {
  url: string;
  title?: string;
  author?: string;
  description?: string;
  coverImage?: string;
  slug?: string;
}

interface ImportResponse {
  success: boolean;
  mdx?: string;
  frontmatter?: Record<string, string | boolean>;
  error?: string;
}

function extractGoogleDocsId(url: string): string | null {
  const patterns = [
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/document\/u\/\d+\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function htmlToMarkdown(html: string): string {
  let markdown = html;

  markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  markdown = markdown.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  markdown = markdown.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  markdown = markdown.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  markdown = markdown.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  markdown = markdown.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n");
  markdown = markdown.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "\n###### $1\n");

  markdown = markdown.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  markdown = markdown.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  markdown = markdown.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  markdown = markdown.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  markdown = markdown.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, "_$1_");
  markdown = markdown.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, "~~$1~~");
  markdown = markdown.replace(/<strike[^>]*>([\s\S]*?)<\/strike>/gi, "~~$1~~");
  markdown = markdown.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, "~~$1~~");

  markdown = markdown.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  markdown = markdown.replace(
    /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    "\n```\n$1\n```\n",
  );

  markdown = markdown.replace(
    /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    "[$2]($1)",
  );

  markdown = markdown.replace(
    /<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi,
    "![$2]($1)",
  );
  markdown = markdown.replace(
    /<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi,
    "![$1]($2)",
  );
  markdown = markdown.replace(
    /<img[^>]*src=["']([^"']*)["'][^>]*\/?>/gi,
    "![]($1)",
  );

  markdown = markdown.replace(/<ul[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/ul>/gi, "\n");
  markdown = markdown.replace(/<ol[^>]*>/gi, "\n");
  markdown = markdown.replace(/<\/ol>/gi, "\n");
  markdown = markdown.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");

  markdown = markdown.replace(
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, content) => {
      return content
        .split("\n")
        .map((line: string) => `> ${line}`)
        .join("\n");
    },
  );

  markdown = markdown.replace(/<hr[^>]*\/?>/gi, "\n---\n");

  markdown = markdown.replace(/<br[^>]*\/?>/gi, "\n");
  markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");
  markdown = markdown.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, "\n$1\n");

  markdown = markdown.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, "$1");

  markdown = markdown.replace(/<[^>]+>/g, "");

  markdown = markdown.replace(/&nbsp;/g, " ");
  markdown = markdown.replace(/&amp;/g, "&");
  markdown = markdown.replace(/&lt;/g, "<");
  markdown = markdown.replace(/&gt;/g, ">");
  markdown = markdown.replace(/&quot;/g, '"');
  markdown = markdown.replace(/&#39;/g, "'");
  markdown = markdown.replace(/&rsquo;/g, "'");
  markdown = markdown.replace(/&lsquo;/g, "'");
  markdown = markdown.replace(/&rdquo;/g, '"');
  markdown = markdown.replace(/&ldquo;/g, '"');
  markdown = markdown.replace(/&mdash;/g, "—");
  markdown = markdown.replace(/&ndash;/g, "–");
  markdown = markdown.replace(/&hellip;/g, "...");

  markdown = markdown.replace(/\n{3,}/g, "\n\n");
  markdown = markdown.trim();

  return markdown;
}

function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    let title = titleMatch[1].trim();
    title = title.replace(/ - Google Docs$/, "");
    return title;
  }
  return null;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateMdx(
  content: string,
  options: {
    title: string;
    author: string;
    description: string;
    coverImage: string;
  },
): string {
  const today = new Date().toISOString().split("T")[0];

  const frontmatter = `---
meta_title: "${options.title}"
display_title: "${options.title}"
meta_description: "${options.description}"
author: "${options.author}"
coverImage: "${options.coverImage}"
featured: false
published: false
date: "${today}"
---`;

  return `${frontmatter}\n\n${content}`;
}

export const Route = createFileRoute("/api/admin/import/google-docs")({
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

        try {
          const body: ImportRequest = await request.json();
          const { url, title, author, description, coverImage, slug } = body;

          if (!url) {
            return new Response(
              JSON.stringify({ success: false, error: "URL is required" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const docId = extractGoogleDocsId(url);
          if (!docId) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid Google Docs URL",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          let html: string;
          let response: Response;

          const publishedUrl = `https://docs.google.com/document/d/${docId}/pub`;
          response = await fetch(publishedUrl);

          if (!response.ok) {
            const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;
            response = await fetch(exportUrl);

            if (!response.ok) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error:
                    "Failed to fetch document. Make sure it is either published to the web (File > Share > Publish to web) or shared with 'Anyone with the link can view' permissions.",
                }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }
          }

          html = await response.text();
          const extractedTitle = extractTitle(html) || "Untitled";
          const finalTitle = title || extractedTitle;
          const finalSlug = slug || generateSlug(finalTitle);

          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const bodyContent = bodyMatch ? bodyMatch[1] : html;

          const markdown = htmlToMarkdown(bodyContent);

          const mdx = generateMdx(markdown, {
            title: finalTitle,
            author: author || "Unknown",
            description: description || "",
            coverImage: coverImage || `/api/images/blog/${finalSlug}/cover.png`,
          });

          const frontmatter = {
            meta_title: finalTitle,
            display_title: finalTitle,
            meta_description: description || "",
            author: author || "Unknown",
            coverImage: coverImage || `/api/images/blog/${finalSlug}/cover.png`,
            featured: false,
            published: false,
            date: new Date().toISOString().split("T")[0],
          };

          const result: ImportResponse = {
            success: true,
            mdx,
            frontmatter,
          };

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: (err as Error).message,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
