import type { StorybookConfig } from "@storybook/react-vite";
import autoprefixer from "autoprefixer";
import tailwind from "tailwindcss";

export default {
  stories: ["../src/stories/*.stories.@(js|jsx|mjs|ts|tsx)"],
  staticDirs: ["../public", "../assets"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-interactions"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    return {
      ...config,
      css: {
        postcss: {
          plugins: [tailwind, autoprefixer],
        },
      },
    };
  },
} satisfies StorybookConfig;
