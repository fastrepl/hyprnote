// vite.config.ts
import { lingui } from "file:///Users/deokhaeng/Desktop/fastrepl/hyprnote/node_modules/.pnpm/@lingui+vite-plugin@5.3.2_typescript@5.8.3_vite@5.4.19_@types+node@22.16.3_lightningcss_e844534d84a4736c1ee3f6d1ee06d058/node_modules/@lingui/vite-plugin/dist/index.cjs";
import { TanStackRouterVite } from "file:///Users/deokhaeng/Desktop/fastrepl/hyprnote/node_modules/.pnpm/@tanstack+router-plugin@1.127.3_@tanstack+react-router@1.127.3_react-dom@18.3.1_react@1_9b802c00f5b62569daf251aea0e16c3e/node_modules/@tanstack/router-plugin/dist/esm/vite.js";
import react from "file:///Users/deokhaeng/Desktop/fastrepl/hyprnote/node_modules/.pnpm/@vitejs+plugin-react@4.6.0_vite@5.4.19_@types+node@22.16.3_lightningcss@1.30.1_sugarss@_129834f9d661536ad7515e808e971ec8/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { DynamicPublicDirectory } from "file:///Users/deokhaeng/Desktop/fastrepl/hyprnote/node_modules/.pnpm/vite-multiple-assets@2.2.5_mime-types@3.0.1_vite@5.4.19_@types+node@22.16.3_lightningcs_803c9c08067b8435bf6bade850e52712/node_modules/vite-multiple-assets/dist/index.mjs";
import { defineConfig } from "file:///Users/deokhaeng/Desktop/fastrepl/hyprnote/node_modules/.pnpm/vite@5.4.19_@types+node@22.16.3_lightningcss@1.30.1_sugarss@5.0.0_postcss@8.5.6__terser@5.43.1/node_modules/vite/dist/node/index.js";
import path from "path";
var __vite_injected_original_dirname = "/Users/deokhaeng/Desktop/fastrepl/hyprnote/apps/desktop";
var host = process.env.TAURI_DEV_HOST;
var vite_config_default = defineConfig(async () => ({
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
    },
  },
  publicDir: "",
  plugins: [
    DynamicPublicDirectory(["public/**/*"], { cwd: __vite_injected_original_dirname }),
    DynamicPublicDirectory(
      [
        {
          input: "*/assets/**/*",
          output: "/assets",
          flatten: true,
        },
      ],
      {
        cwd: path.resolve(__vite_injected_original_dirname, "../../extensions"),
      },
    ),
    lingui(),
    TanStackRouterVite({ target: "react", autoCodeSplitting: false }),
    react({
      babel: {
        plugins: ["@lingui/babel-plugin-lingui-macro"],
      },
    }),
  ],
  ...tauri,
}));
var tauri = {
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : void 0,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    outDir: "./dist",
    chunkSizeWarningLimit: 500 * 10,
    target: process.env.TAURI_ENV_PLATFORM == "windows" ? "chrome105" : "safari13",
    // minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    minify: false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
};
export { vite_config_default as default };
// # sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZGVva2hhZW5nL0Rlc2t0b3AvZmFzdHJlcGwvaHlwcm5vdGUvYXBwcy9kZXNrdG9wXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvZGVva2hhZW5nL0Rlc2t0b3AvZmFzdHJlcGwvaHlwcm5vdGUvYXBwcy9kZXNrdG9wL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9kZW9raGFlbmcvRGVza3RvcC9mYXN0cmVwbC9oeXBybm90ZS9hcHBzL2Rlc2t0b3Avdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG5pbXBvcnQgeyBsaW5ndWkgfSBmcm9tIFwiQGxpbmd1aS92aXRlLXBsdWdpblwiO1xuaW1wb3J0IHsgVGFuU3RhY2tSb3V0ZXJWaXRlIH0gZnJvbSBcIkB0YW5zdGFjay9yb3V0ZXItcGx1Z2luL3ZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgdHlwZSBVc2VyQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCB7IER5bmFtaWNQdWJsaWNEaXJlY3RvcnkgfSBmcm9tIFwidml0ZS1tdWx0aXBsZS1hc3NldHNcIjtcblxuY29uc3QgaG9zdCA9IHByb2Nlc3MuZW52LlRBVVJJX0RFVl9IT1NUO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKGFzeW5jICgpID0+ICh7XG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgcHVibGljRGlyOiBcIlwiLFxuICBwbHVnaW5zOiBbXG4gICAgRHluYW1pY1B1YmxpY0RpcmVjdG9yeShbXCJwdWJsaWMvKiovKlwiXSwgeyBjd2Q6IF9fZGlybmFtZSB9KSxcbiAgICBEeW5hbWljUHVibGljRGlyZWN0b3J5KFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaW5wdXQ6IFwiKi9hc3NldHMvKiovKlwiLFxuICAgICAgICAgIG91dHB1dDogXCIvYXNzZXRzXCIsXG4gICAgICAgICAgZmxhdHRlbjogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICB7XG4gICAgICAgIGN3ZDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuLi8uLi9leHRlbnNpb25zXCIpLFxuICAgICAgfSxcbiAgICApLFxuICAgIGxpbmd1aSgpLFxuICAgIFRhblN0YWNrUm91dGVyVml0ZSh7IHRhcmdldDogXCJyZWFjdFwiLCBhdXRvQ29kZVNwbGl0dGluZzogZmFsc2UgfSksXG4gICAgcmVhY3Qoe1xuICAgICAgYmFiZWw6IHtcbiAgICAgICAgcGx1Z2luczogW1wiQGxpbmd1aS9iYWJlbC1wbHVnaW4tbGluZ3VpLW1hY3JvXCJdLFxuICAgICAgfSxcbiAgICB9KSxcbiAgXSxcbiAgLi4udGF1cmksXG59KSk7XG5cbi8vIGh0dHBzOi8vdjIudGF1cmkuYXBwL3N0YXJ0L2Zyb250ZW5kL3ZpdGUvI3VwZGF0ZS12aXRlLWNvbmZpZ3VyYXRpb25cbmNvbnN0IHRhdXJpOiBVc2VyQ29uZmlnID0ge1xuICBjbGVhclNjcmVlbjogZmFsc2UsXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDE0MjAsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICBob3N0OiBob3N0IHx8IGZhbHNlLFxuICAgIGhtcjogaG9zdFxuICAgICAgPyB7XG4gICAgICAgIHByb3RvY29sOiBcIndzXCIsXG4gICAgICAgIGhvc3QsXG4gICAgICAgIHBvcnQ6IDE0MjEsXG4gICAgICB9XG4gICAgICA6IHVuZGVmaW5lZCxcbiAgICB3YXRjaDoge1xuICAgICAgaWdub3JlZDogW1wiKiovc3JjLXRhdXJpLyoqXCJdLFxuICAgIH0sXG4gIH0sXG4gIGVudlByZWZpeDogW1wiVklURV9cIiwgXCJUQVVSSV9FTlZfKlwiXSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6IFwiLi9kaXN0XCIsXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA1MDAgKiAxMCxcbiAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlRBVVJJX0VOVl9QTEFURk9STSA9PSBcIndpbmRvd3NcIiA/IFwiY2hyb21lMTA1XCIgOiBcInNhZmFyaTEzXCIsXG4gICAgLy8gbWluaWZ5OiAhcHJvY2Vzcy5lbnYuVEFVUklfRU5WX0RFQlVHID8gXCJlc2J1aWxkXCIgOiBmYWxzZSxcbiAgICBtaW5pZnk6IGZhbHNlLFxuICAgIHNvdXJjZW1hcDogISFwcm9jZXNzLmVudi5UQVVSSV9FTlZfREVCVUcsXG4gIH0sXG59O1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1VixPQUFPLFVBQVU7QUFFeFcsU0FBUyxjQUFjO0FBQ3ZCLFNBQVMsMEJBQTBCO0FBQ25DLE9BQU8sV0FBVztBQUNsQixTQUFTLG9CQUFxQztBQUM5QyxTQUFTLDhCQUE4QjtBQU52QyxJQUFNLG1DQUFtQztBQVF6QyxJQUFNLE9BQU8sUUFBUSxJQUFJO0FBR3pCLElBQU8sc0JBQVEsYUFBYSxhQUFhO0FBQUEsRUFDdkMsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsV0FBVztBQUFBLEVBQ1gsU0FBUztBQUFBLElBQ1AsdUJBQXVCLENBQUMsYUFBYSxHQUFHLEVBQUUsS0FBSyxpQ0FBVSxDQUFDO0FBQUEsSUFDMUQ7QUFBQSxNQUNFO0FBQUEsUUFDRTtBQUFBLFVBQ0UsT0FBTztBQUFBLFVBQ1AsUUFBUTtBQUFBLFVBQ1IsU0FBUztBQUFBLFFBQ1g7QUFBQSxNQUNGO0FBQUEsTUFDQTtBQUFBLFFBQ0UsS0FBSyxLQUFLLFFBQVEsa0NBQVcsa0JBQWtCO0FBQUEsTUFDakQ7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsSUFDUCxtQkFBbUIsRUFBRSxRQUFRLFNBQVMsbUJBQW1CLE1BQU0sQ0FBQztBQUFBLElBQ2hFLE1BQU07QUFBQSxNQUNKLE9BQU87QUFBQSxRQUNMLFNBQVMsQ0FBQyxtQ0FBbUM7QUFBQSxNQUMvQztBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLEdBQUc7QUFDTCxFQUFFO0FBR0YsSUFBTSxRQUFvQjtBQUFBLEVBQ3hCLGFBQWE7QUFBQSxFQUNiLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE1BQU0sUUFBUTtBQUFBLElBQ2QsS0FBSyxPQUNEO0FBQUEsTUFDQSxVQUFVO0FBQUEsTUFDVjtBQUFBLE1BQ0EsTUFBTTtBQUFBLElBQ1IsSUFDRTtBQUFBLElBQ0osT0FBTztBQUFBLE1BQ0wsU0FBUyxDQUFDLGlCQUFpQjtBQUFBLElBQzdCO0FBQUEsRUFDRjtBQUFBLEVBQ0EsV0FBVyxDQUFDLFNBQVMsYUFBYTtBQUFBLEVBQ2xDLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLHVCQUF1QixNQUFNO0FBQUEsSUFDN0IsUUFBUSxRQUFRLElBQUksc0JBQXNCLFlBQVksY0FBYztBQUFBO0FBQUEsSUFFcEUsUUFBUTtBQUFBLElBQ1IsV0FBVyxDQUFDLENBQUMsUUFBUSxJQUFJO0FBQUEsRUFDM0I7QUFDRjsiLAogICJuYW1lcyI6IFtdCn0K
