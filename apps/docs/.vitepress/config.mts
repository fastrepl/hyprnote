import { defineConfig } from "vitepress";
import sidebar from "./sidebar";

// https://vitepress.dev/reference/site-config
const vitepressConfig: Parameters<typeof defineConfig>[0] = {
  title: "Hyprnote",
  description: "Hackable AI notepad for meetings",
  // https://vitepress.dev/reference/default-theme-config
  themeConfig: {
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
