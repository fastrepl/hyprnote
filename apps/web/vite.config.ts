import contentCollections from "@content-collections/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { generateSitemap } from "tanstack-router-sitemap";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

import { getSitemap } from "./src/utils/sitemap";

const config = defineConfig(() => ({
  plugins: [
    contentCollections(),
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      sitemap: {
        host: "https://hyprnote.com",
      },
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoStaticPathsDiscovery: true,
        filter: ({ path }) => {
          return !(
            path.startsWith("/apps") ||
            path.startsWith("/callback") ||
            path.startsWith("/integrations") ||
            path.startsWith("/k6-reports") ||
            path.startsWith("/admin") ||
            path.startsWith("/api") ||
            path.startsWith("/webhook")
          );
        },
      },
    }),
    viteReact(),
    generateSitemap(getSitemap()),
    netlify({ dev: { images: { enabled: true } } }),
  ],
  ssr: {
    noExternal: [
      "posthog-js",
      "@posthog/react",
      "react-tweet",
      "@content-collections/mdx",
    ],
  },
}));

export default config;
