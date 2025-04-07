import { DefaultTheme } from "vitepress";

const extensions: DefaultTheme.SidebarItem = {
  text: "Extensions",
  items: [
    { text: "What is an extension?", link: "/extensions" },
    {
      text: "List of extensions",
      items: [
        { text: "Dino Game", link: "/extensions/dino-game" },
        { text: "Live Summary", link: "/extensions/live-summary" },
        { text: "Timer", link: "/extensions/timer" },
        { text: "Transcript", link: "/extensions/transcript" },
        { text: "Twenty", link: "/extensions/twenty" },
      ].sort((a, b) => a.text.localeCompare(b.text)),
      collapsed: true,
    },
  ],
};

const plugins: DefaultTheme.SidebarItem = {
  text: "Plugins",
  items: [
    { text: "What is a plugin?", link: "/plugins" },
    {
      text: "List of plugins",
      items: [
        { text: "Database", link: "/plugins/db" },
        { text: "Template", link: "/plugins/template" },
        { text: "Listener", link: "/plugins/listener" },
        { text: "Local LLM", link: "/plugins/local-llm" },
        { text: "Local STT", link: "/plugins/local-stt" },
        { text: "Apple Calendar", link: "/plugins/apple-calendar" },
        { text: "Miscellaneous", link: "/plugins/misc" },
        { text: "Windows", link: "/plugins/windows" },
        { text: "Auth", link: "/plugins/auth" },
        { text: "Sound Effects", link: "/plugins/sfx" },
        { text: "Analytics", link: "/plugins/analytics" },
        { text: "Flags", link: "/plugins/flags" },
      ].sort((a, b) => a.text.localeCompare(b.text)),
      collapsed: true,
    },
  ],
};

const development: DefaultTheme.SidebarItem = {
  text: "Development",
  collapsed: true,
  items: [
    { text: "Contributing", link: "/development/contributing" },
    { text: "Extension", link: "/development/extension" },
    { text: "Plugin", link: "/development/plugin" },
    { text: "Internalization", link: "/development/i18n" },
    { text: "Miscellaneous", link: "/development/miscellaneous" },
  ],
};

const sidebar: DefaultTheme.SidebarItem[] = [
  {
    text: "Start Here",
    items: [
      {
        text: "Introduction",
        link: "/",
      },
      {
        text: "Quickstart",
        link: "/quickstart",
      },
    ],
  },
  extensions,
  plugins,
  development,
];

export default sidebar;
