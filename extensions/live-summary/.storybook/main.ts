import type { StorybookConfig } from "@storybook/react-vite";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

const config: StorybookConfig = {
  stories: ["../src/*.stories.@(js|jsx|mjs|ts|tsx)"],
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
};
export default config;
