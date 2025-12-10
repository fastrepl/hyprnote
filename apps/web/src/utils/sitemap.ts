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
      "/opensource": {
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
      "/brand": {
        priority: 0.5,
        changeFrequency: "monthly",
      },
      "/company-handbook": {
        priority: 0.6,
        changeFrequency: "weekly",
      },
      "/file-transcription": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/free": {
        priority: 0.7,
        changeFrequency: "monthly",
      },
      "/gallery": {
        priority: 0.7,
        changeFrequency: "weekly",
      },
      "/oss-friends": {
        priority: 0.6,
        changeFrequency: "monthly",
      },
      "/press-kit": {
        priority: 0.5,
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
      "/shortcuts": {
        priority: 0.7,
        changeFrequency: "weekly",
      },

      "/download": {
        priority: 0.7,
        changeFrequency: "weekly",
      },
      "/download/apple-intel": {
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
          return allArticles
            .filter((article: any) => article.published !== false)
            .map((article: any) => ({
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

      "/templates/$slug": async () => {
        try {
          const path = await import("path");
          const url = await import("url");
          const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
          const modulePath = path.resolve(
            __dirname,
            "../../.content-collections/generated/allTemplates.js",
          );
          const { default: allTemplates } = await import(modulePath);
          return allTemplates.map((template: any) => ({
            path: `/templates/${template.slug}`,
            priority: 0.7,
            changeFrequency: "weekly" as const,
          }));
        } catch (error) {
          console.warn("Failed to load templates for sitemap:", error);
          return [];
        }
      },

      "/shortcuts/$slug": async () => {
        try {
          const path = await import("path");
          const url = await import("url");
          const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
          const modulePath = path.resolve(
            __dirname,
            "../../.content-collections/generated/allShortcuts.js",
          );
          const { default: allShortcuts } = await import(modulePath);
          return allShortcuts.map((shortcut: any) => ({
            path: `/shortcuts/${shortcut.slug}`,
            priority: 0.7,
            changeFrequency: "weekly" as const,
          }));
        } catch (error) {
          console.warn("Failed to load shortcuts for sitemap:", error);
          return [];
        }
      },

      "/roadmap/$slug": async () => {
        return [];
      },

      "/vs/$slug": async () => {
        try {
          const path = await import("path");
          const url = await import("url");
          const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
          const modulePath = path.resolve(
            __dirname,
            "../../.content-collections/generated/allVs.js",
          );
          const { default: allVs } = await import(modulePath);
          return allVs.map((vs: any) => ({
            path: `/vs/${vs.slug}`,
            priority: 0.7,
            changeFrequency: "monthly" as const,
          }));
        } catch (error) {
          console.warn("Failed to load vs pages for sitemap:", error);
          return [];
        }
      },

      "/company-handbook/$": async () => {
        try {
          const path = await import("path");
          const url = await import("url");
          const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
          const modulePath = path.resolve(
            __dirname,
            "../../.content-collections/generated/allHandbooks.js",
          );
          const { default: allHandbooks } = await import(modulePath);
          return allHandbooks.map((handbook: any) => ({
            path: `/company-handbook/${handbook.slug}`,
            priority: 0.6,
            changeFrequency: "weekly" as const,
            lastModified: handbook.updated || handbook.created,
          }));
        } catch (error) {
          console.warn("Failed to load handbook pages for sitemap:", error);
          return [];
        }
      },

      "/gallery/$type/$slug": async () => {
        try {
          const path = await import("path");
          const url = await import("url");
          const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

          const templatesPath = path.resolve(
            __dirname,
            "../../.content-collections/generated/allTemplates.js",
          );
          const shortcutsPath = path.resolve(
            __dirname,
            "../../.content-collections/generated/allShortcuts.js",
          );

          const { default: allTemplates } = await import(templatesPath);
          const { default: allShortcuts } = await import(shortcutsPath);

          const templateUrls = allTemplates.map((template: any) => ({
            path: `/gallery/template/${template.slug}`,
            priority: 0.7,
            changeFrequency: "weekly" as const,
          }));

          const shortcutUrls = allShortcuts.map((shortcut: any) => ({
            path: `/gallery/shortcut/${shortcut.slug}`,
            priority: 0.7,
            changeFrequency: "weekly" as const,
          }));

          return [...templateUrls, ...shortcutUrls];
        } catch (error) {
          console.warn("Failed to load gallery items for sitemap:", error);
          return [];
        }
      },
    },
  };
}
