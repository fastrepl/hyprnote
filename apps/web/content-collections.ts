import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { z } from "zod";

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
  schema: z.object({
    display_title: z.string().optional(),
    meta_title: z.string(),
    meta_description: z.string(),
    author: z.string(),
    created: z.string(),
    updated: z.string().optional(),
    coverImage: z.string().optional(),
    featured: z.boolean().optional(),
  }),
  transform: async (document, context) => {
    const toc = extractToc(document.content);

    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm],
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
  schema: z.object({
    version: z.string(),
    author: z.string(),
    created: z.string(),
    updated: z.string().optional(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm],
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
    const author = "Hyprnote Team";

    return {
      ...document,
      mdx,
      slug,
      author,
    };
  },
});

const docs = defineCollection({
  name: "docs",
  directory: "content/docs",
  include: "**/*.mdx",
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    category: z.string().optional(),
    author: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
  }),
  transform: async (document, context) => {
    const toc = extractToc(document.content);

    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm],
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

    const slug = document._meta.path.replace(/\.mdx$/, "");

    const isIndex = fileName === "index";

    return {
      ...document,
      mdx,
      slug,
      sectionFolder,
      isIndex,
      toc,
    };
  },
});

const legal = defineCollection({
  name: "legal",
  directory: "content/legal",
  include: "*.mdx",
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    updated: z.string(),
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document, {
      remarkPlugins: [remarkGfm],
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
      remarkPlugins: [remarkGfm],
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

export default defineConfig({
  collections: [articles, changelog, docs, legal, templates],
});
