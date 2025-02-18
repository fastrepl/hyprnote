import { defineConfig } from "unocss";

import presetWind from "@unocss/preset-wind3";
import presetIcons from "@unocss/preset-icons";

export default defineConfig({
  presets: [
    presetWind({ important: true }),
    // https://icones.js.org
    presetIcons({
      collections: {
        heroicons: () =>
          import("@iconify-json/heroicons/icons.json").then((i) => i.default),
      },
    }),
  ],
});
