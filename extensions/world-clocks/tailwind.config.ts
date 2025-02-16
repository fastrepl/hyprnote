import path from "path";
import type { Config } from "tailwindcss";

const config = {
  content: [path.resolve(__dirname, "./src/*.tsx")],
} satisfies Config;

export default config;
