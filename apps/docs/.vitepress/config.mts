import unocss from "unocss/vite";
import { vitePostHog } from "vite-plugin-posthog";
import { defineConfig } from "vitepress";

import sidebar from "./sidebar";
import { pluginFrontmatterSchema } from "./types";

// https://vitepress.dev/reference/site-config
const vitepressConfig: Parameters<typeof defineConfig>[0] = {
  lang: "en-US",
  title: "Hyprnote",
  description: "Hackable AI notepad for meetings",
  vite: {
    plugins: [
      unocss({ configFile: ".vitepress/uno.config.ts" }),
      vitePostHog({
        apiKey: "phc_PkQI9BzPFkfFeol5A8RDj3ioh2MOQjxyqV0gjuNHKG6",
        hostUrl: "https://us.i.posthog.com",
        isCheckingForDevMode: false,
        config: {
          autocapture: true,
          person_profiles: "never",
        },
      }),
    ],
  },
  // https://vitepress.dev/reference/default-theme-config
  themeConfig: {
    editLink: {
      pattern: "https://github.com/fastrepl/hypr/edit/main/apps/docs/:path",
      text: "Edit this page on GitHub",
    },
    nav: [
      {
        text: "Download",
        items: [
          {
            text: "MacOS (Silicon)",
            link: "https://cdn.crabnebula.app/download/fastrepl/hyprnote/latest/platform/dmg-aarch64?channel=stable",
          },
          {
            text: "MacOS (Intel)",
            link: "https://cdn.crabnebula.app/download/fastrepl/hyprnote/latest/platform/dmg-x86_64?channel=stable",
          },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://hyprnote.com/github" },
      { icon: "discord", link: "https://hyprnote.com/discord" },
    ],
    sidebar,
  },
  transformPageData(pageData, ctx) {
    if (/^plugins\/(?!index\.md)[^/]+/.test(pageData.relativePath)) {
      pluginFrontmatterSchema.parse(pageData.frontmatter);
    }
    return pageData;
  },
};

export default defineConfig(vitepressConfig);
