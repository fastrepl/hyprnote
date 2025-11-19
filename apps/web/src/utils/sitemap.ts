import { type Sitemap } from "tanstack-router-sitemap";

import { type FileRouteTypes } from "@/routeTree.gen";

export type TRoutes = FileRouteTypes["fullPaths"];

export function getSitemap(): Sitemap<TRoutes> {
  return {
    siteUrl: "https://hyprnote.com",
    defaultPriority: 0.5,
    defaultChangeFreq: "monthly",
    routes: {
      "/": {
        priority: 1.0,
        changeFrequency: "daily",
      },
      "/pricing": {
        priority: 0.9,
        changeFrequency: "monthly",
      },
      "/docs": {
        priority: 0.9,
        changeFrequency: "weekly",
      },
      "/enterprise": {
        priority: 0.8,
        changeFrequency: "monthly",
      },

      "/blog": {
        priority: 0.8,
        changeFrequency: "daily",
      },
      "/changelog": {
        priority: 0.7,
        changeFrequency: "weekly",
      },

      "/product/ai-assistant": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/ai-notetaking": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/api": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/bot": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/extensions": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/local-ai": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/memory": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/mini-apps": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/notepad": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/opensource": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/self-hosting": {
        priority: 0.8,
        changeFrequency: "monthly",
      },
      "/product/workflows": {
        priority: 0.8,
        changeFrequency: "monthly",
      },

      "/solution/customer-success": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/solution/field-engineering": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/solution/government": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/solution/healthcare": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/solution/legal": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/solution/media": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/solution/project-management": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/solution/recruiting": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/solution/sales": {
        priority: 0.7,
        changeFrequency: "monthly",
      },

      "/about": {
        priority: 0.6,
        changeFrequency: "monthly",
      },
      "/contact": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/faq": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/roadmap": {
        priority: 0.7,
        changeFrequency: "weekly",
      },
      "/security": {
        priority: 0.6,
        changeFrequency: "monthly",
      },
      "/templates": {
        priority: 0.7,
        changeFrequency: "weekly",
      },

      "/download": {
        priority: 0.7,
        changeFrequency: "weekly",
      },
      "/download/apple-silicon": {
        priority: 0.7,
        changeFrequency: "weekly",
      },

      "/legal": {
        priority: 0.5,
        changeFrequency: "yearly",
      },

      "/blog/$slug": async () => {
        try {
          const path = await import("path");
          const url = await import("url");
          const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
          const modulePath = path.resolve(
            __dirname,
            "../../.content-collections/generated/allArticles.js",
          );
          const { default: allArticles } = await import(modulePath);
          return allArticles.map((article: any) => ({
            path: `/blog/${article.slug}`,
            priority: 0.7,
            changeFrequency: "weekly" as const,
            lastModified: article.updated || article.created,
          }));
        } catch (error) {
          console.warn("Failed to load blog articles for sitemap:", error);
          return [];
        }
      },

      "/changelog/$slug": async () => {
        try {
          const path = await import("path");
          const url = await import("url");
          const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
          const modulePath = path.resolve(
            __dirname,
            "../../.content-collections/generated/allChangelogs.js",
          );
          const { default: allChangelogs } = await import(modulePath);
          return allChangelogs.map((changelog: any) => ({
            path: `/changelog/${changelog.slug}`,
            priority: 0.6,
            changeFrequency: "monthly" as const,
            lastModified: changelog.updated || changelog.created,
          }));
        } catch (error) {
          console.warn("Failed to load changelogs for sitemap:", error);
          return [];
        }
      },

      "/legal/$slug": async () => {
        try {
          const path = await import("path");
          const url = await import("url");
          const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
          const modulePath = path.resolve(
            __dirname,
            "../../.content-collections/generated/allLegals.js",
          );
          const { default: allLegals } = await import(modulePath);
          return allLegals.map((legal: any) => ({
            path: `/legal/${legal.slug}`,
            priority: 0.5,
            changeFrequency: "yearly" as const,
            lastModified: legal.updated || legal.created,
          }));
        } catch (error) {
          console.warn("Failed to load legal docs for sitemap:", error);
          return [];
        }
      },

      "/docs/$": async () => {
        try {
          const path = await import("path");
          const url = await import("url");
          const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
          const modulePath = path.resolve(
            __dirname,
            "../../.content-collections/generated/allDocs.js",
          );
          const { default: allDocs } = await import(modulePath);
          return allDocs.map((doc: any) => ({
            path: `/docs/${doc.slug}`,
            priority: 0.8,
            changeFrequency: "weekly" as const,
            lastModified: doc.updated || doc.created,
          }));
        } catch (error) {
          console.warn("Failed to load docs for sitemap:", error);
          return [];
        }
      },
    },
  };
}
