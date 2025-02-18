import { defineConfig } from "vitepress";
import { vitePostHog } from "vite-plugin-posthog";
import unocss from "unocss/vite";

import sidebar from "./sidebar";

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
          person_profiles: "identified_only",
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
      { text: "Blog", link: "https://github.com/fastrepl/hypr" },
      {
        text: "v0.0.1",
        items: [
          { text: "v0.0.1", link: "https://github.com/fastrepl/hypr" },
          { text: "v0.0.2-nightly", link: "https://github.com/fastrepl/hypr" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/fastrepl/hypr" },
      { icon: "discord", link: "https://discord.gg/fastrepl" },
    ],
    sidebar,
  },
};

export default defineConfig(vitepressConfig);
