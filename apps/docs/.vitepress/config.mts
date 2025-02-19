import { defineConfig } from "vitepress";
import { vitePostHog } from "vite-plugin-posthog";
import unocss from "unocss/vite";

import sidebar from "./sidebar";
import { extensionFrontmatterSchema, pluginFrontmatterSchema } from "./types";

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
            text: "Stable",
            link: "https://cdn.crabnebula.app/download/fastrepl/hyprnote/latest/platform/dmg-aarch64",
          },
          {
            text: "Nightly",
            link: "https://cdn.crabnebula.app/download/fastrepl/hyprnote/latest/platform/dmg-aarch64?channel=nightly",
          },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/fastrepl/hypr" },
      { icon: "discord", link: "https://discord.gg/fastrepl" },
    ],
    sidebar,
  },
  transformPageData(pageData, ctx) {
    if (/^extensions\/(?!index\.md)[^/]+/.test(pageData.relativePath)) {
      extensionFrontmatterSchema.parse(pageData.frontmatter);
    }
    if (/^plugins\/(?!index\.md)[^/]+/.test(pageData.relativePath)) {
      pluginFrontmatterSchema.parse(pageData.frontmatter);
    }
    return pageData;
  },
};

export default defineConfig(vitepressConfig);
