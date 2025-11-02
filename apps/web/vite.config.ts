import contentCollections from "@content-collections/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig(() => ({
  plugins: [
    netlify({ dev: { images: { enabled: true } } }),
    contentCollections(),
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoStaticPathsDiscovery: true,
        filter: ({ path }) => {
          return path.startsWith("/blog")
            || path.startsWith("/docs")
            || path.startsWith("/changelog")
            || path.startsWith("/legal")
            || path.startsWith("/product")
            || path.startsWith("/pricing");
        },
      },
    }),
    viteReact(),
  ],
}));

export default config;
