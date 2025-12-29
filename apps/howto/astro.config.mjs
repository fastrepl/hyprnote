// @ts-check
import mdx from "@astrojs/mdx";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://howto.hyprnote.com",
  integrations: [mdx(), react()],
  adapter: netlify(),
  markdown: {
    shikiConfig: {
      theme: "github-light",
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
