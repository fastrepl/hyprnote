import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@hypr/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@hypr/tiptap": path.resolve(__dirname, "../../packages/tiptap/src"),
      "@hypr/utils": path.resolve(__dirname, "../../packages/utils/src"),
    },
  },
});
