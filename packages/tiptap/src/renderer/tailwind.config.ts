import path from "path";
import type { Config } from "tailwindcss";

const config = {
  content: [path.resolve(__dirname, "./*.tsx")],
} satisfies Config;

export default config;
