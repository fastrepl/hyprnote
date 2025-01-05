import type { Config } from "tailwindcss";
import UI from "@hypr/ui/tailwind.config";

const config = {
  ...UI,
  content: [...UI.content, "src/components/**/*.tsx", "index.html"],
} satisfies Config;

export default config;
