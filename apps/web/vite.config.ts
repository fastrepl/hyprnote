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
          const dynamicRoutes = [
            "/api",
            "/webhook",
            "/app",
            "/callback",
            "/t",
            "/new",
          ];
          const externalRedirectRoutes = [
            "/download/linux-deb",
            "/download/linux-appimage",
            "/download/windows",
            "/download/apple-silicon",
            "/download/apple-intel",
          ];
          return (
            !dynamicRoutes.some(
              (route) => path === route || path.startsWith(route + "/"),
            ) && !externalRedirectRoutes.includes(path)
          );
        },
      },
    }),
    viteReact(),
    generateSitemap(getSitemap()),
    netlify({ dev: { images: { enabled: true } } }),
  ],
  ssr: {
    noExternal: ["posthog-js", "@posthog/react", "react-tweet"],
  },
}));

export default config;
