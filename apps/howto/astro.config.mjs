// @ts-check
import mdx from "@astrojs/mdx";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [mdx(), react()],
  adapter: netlify(),
  vite: {
    plugins: [tailwindcss()],
  },
});
