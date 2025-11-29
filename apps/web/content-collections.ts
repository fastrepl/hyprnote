import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import mdxMermaid from "mdx-mermaid";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { z } from "zod";

import { VersionPlatform } from "@/scripts/versioning";

function extractToc(
  content: string,
): Array<{ id: string; text: string; level: number }> {
  const toc: Array<{ id: string; text: string; level: number }> = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();

      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

      toc.push({ id, text, level });
    }
  }

  return toc;
}

const articles = defineCollection({
  name: "articles",
  directory: "content/articles",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    display_title: z.string().optional(),
    meta_title: z.string(),
    meta_description: z.string(),
    author: z.enum(["Harshika", "John Jeong", "Yujong Lee"]),
    created: z.string(),
    updated: z.string().optional(),
    coverImage: z.string().optional(),
    featured: z.boolean().optional(),
    published: z.boolean().default(true),
    category: z
      .enum([
        "Case Study",
        "Hyprnote Weekly",
        "Productivity Hack",
        "Engineering",
      ])
      .optional(),
  }),
  transform: async (document, context) => {
    const toc = extractToc(document.content);

    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    const author = document.author || "Hyprnote Team";
    const title = document.display_title || document.meta_title;
    const updated = document.updated || document.created;

    return {
      ...document,
      mdx,
      slug,
      author,
      updated,
      title,
      toc,
    };
  },
});

const changelog = defineCollection({
  name: "changelog",
  directory: "content/changelog",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    created: z.coerce.date(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const version = document._meta.path.replace(/\.mdx$/, "");
    const tag = `desktop_v${version}`;

    const downloads: Record<VersionPlatform, string> = {
      "dmg-aarch64": `https://github.com/fastrepl/hyprnote/releases/download/${tag}/hyprnote-macos-aarch64.dmg`,
      "appimage-x86_64": `https://github.com/fastrepl/hyprnote/releases/download/${tag}/hyprnote-linux-x86_64.AppImage`,
    };

    return {
      ...document,
      mdx,
      slug: version,
      version,
      downloads,
    };
  },
});

const docs = defineCollection({
  name: "docs",
  directory: "content/docs",
  include: "**/*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    section: z.string(),
    summary: z.string().optional(),
    category: z.string().optional(),
    author: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
  }),
  transform: async (document, context) => {
    const toc = extractToc(document.content);

    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const pathParts = document._meta.path.split("/");
    const fileName = pathParts.pop()!.replace(/\.mdx$/, "");

    const sectionFolder = pathParts[0] || "general";

    const isIndex = fileName === "index";

    const orderMatch = fileName.match(/^(\d+)\./);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 999;

    const cleanFileName = fileName.replace(/^\d+\./, "");
    const cleanPath =
      pathParts.length > 0
        ? `${pathParts.join("/")}/${cleanFileName}`
        : cleanFileName;
    const slug = cleanPath;

    return {
      ...document,
      mdx,
      slug,
      sectionFolder,
      isIndex,
      order,
      toc,
    };
  },
});

const legal = defineCollection({
  name: "legal",
  directory: "content/legal",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    updated: z.string(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const templates = defineCollection({
  name: "templates",
  directory: "content/templates",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    targets: z.array(z.string()),
    sections: z.array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
      }),
    ),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const hooks = defineCollection({
  name: "hooks",
  directory: "content/hooks",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    name: z.string(),
    description: z.string(),
    args: z
      .array(
        z.object({
          name: z.string(),
          type_name: z.string(),
          description: z.string(),
          optional: z.boolean().default(false),
        }),
      )
      .optional(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const deeplinks = defineCollection({
  name: "deeplinks",
  directory: "content/deeplinks",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    path: z.string(),
    description: z.string().nullable(),
    params: z
      .array(
        z.object({
          name: z.string(),
          type_name: z.string(),
          description: z.string().nullable(),
        }),
      )
      .optional(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const vs = defineCollection({
  name: "vs",
  directory: "content/vs",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    name: z.string(),
    icon: z.string(),
    headline: z.string(),
    description: z.string(),
    metaDescription: z.string(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const shortcuts = defineCollection({
  name: "shortcuts",
  directory: "content/shortcuts",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    prompt: z.string(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    return {
      ...document,
      mdx,
      slug,
    };
  },
});

const roadmap = defineCollection({
  name: "roadmap",
  directory: "content/roadmap",
  include: "*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    status: z.enum(["todo", "in-progress", "done"]),
    created: z.string(),
    updated: z.string().optional(),
    labels: z.array(z.string()).optional(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const slug = document._meta.path.replace(/\.mdx$/, "");

    const githubIssueRegex =
      /https:\/\/github\.com\/[^\/\s]+\/[^\/\s]+\/issues\/\d+/g;
    const githubIssues = document.content.match(githubIssueRegex) || [];

    return {
      ...document,
      mdx,
      slug,
      githubIssues,
    };
  },
});

const handbook = defineCollection({
  name: "handbook",
  directory: "content/handbook",
  include: "**/*.mdx",
  exclude: "AGENTS.md",
  schema: z.object({
    title: z.string(),
    section: z.string(),
    summary: z.string().optional(),
    author: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
  }),
  transform: async (document, context) => {
    const toc = extractToc(document.content);

    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm, mdxMermaid],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              className: ["anchor"],
            },
          },
        ],
      ],
    });

    const pathParts = document._meta.path.split("/");
    const fileName = pathParts.pop()!.replace(/\.mdx$/, "");

    const sectionFolder = pathParts[0] || "general";

    const isIndex = fileName === "index";

    const orderMatch = fileName.match(/^(\d+)\./);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 999;

    const cleanFileName = fileName.replace(/^\d+\./, "");
    const cleanPath =
      pathParts.length > 0
        ? `${pathParts.join("/")}/${cleanFileName}`
        : cleanFileName;
    const slug = cleanPath;

    return {
      ...document,
      mdx,
      slug,
      sectionFolder,
      isIndex,
      order,
      toc,
    };
  },
});

export default defineConfig({
  collections: [
    articles,
    changelog,
    docs,
    legal,
    templates,
    shortcuts,
    hooks,
    deeplinks,
    vs,
    handbook,
    roadmap,
  ],
});
