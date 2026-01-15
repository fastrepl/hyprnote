import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Hyprnote",
    description: "Sync Google Meet mute state with Hyprnote desktop app",
    permissions: ["nativeMessaging"],
    host_permissions: ["https://meet.google.com/*"],
    icons: {
      32: "/icon-32.png",
      48: "/icon-48.png",
      128: "/icon-128.png",
    },
  },
});
