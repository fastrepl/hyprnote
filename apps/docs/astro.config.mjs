import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://hyprnote.com",
  base: "/docs",
  integrations: [
    starlight({
      title: "Hyprnote",
      logo: {
        src: "./src/assets/logo.svg",
        replacesTitle: true,
      },
      social: {
        github: "https://github.com/fastrepl/hyprnote",
        discord: "https://hyprnote.com/discord",
        "x.com": "https://x.com/hyprnote",
      },
      customCss: ["./src/styles/custom.css"],
      components: {
        Header: "./src/components/Header.astro",
      },
      sidebar: [
        {
          label: "About",
          autogenerate: { directory: "about" },
        },
        {
          label: "Getting Started",
          autogenerate: { directory: "getting-started" },
        },
        {
          label: "Calendar",
          autogenerate: { directory: "calendar" },
        },
        {
          label: "Developers",
          autogenerate: { directory: "developers" },
        },
        {
          label: "Pro",
          autogenerate: { directory: "pro" },
        },
        {
          label: "FAQ",
          autogenerate: { directory: "faq" },
        },
      ],
    }),
  ],
});
