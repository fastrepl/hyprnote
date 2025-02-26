import { DefaultTheme } from "vitepress";

const extensions: DefaultTheme.SidebarItem = {
  text: "Extensions",
  items: [
    { text: "What is an extension?", link: "/extensions" },
    {
      text: "List of extensions",
      items: [
        { text: "Google Calendar", link: "/extensions/google-calendar" },
        { text: "Outlook Calendar", link: "/extensions/outlook-calendar" },
        { text: "Live summary", link: "/extensions/live-summary" },
        { text: "Live transcript", link: "/extensions/live-transcript" },
        { text: "Linear", link: "/extensions/linear" },
        { text: "Notion", link: "/extensions/notion" },
        { text: "Slack", link: "/extensions/slack" },
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
      ].sort((a, b) => a.text.localeCompare(b.text)),
      collapsed: true,
    },
  ],
};

const development: DefaultTheme.SidebarItem = {
  text: "Development",
  items: [
    { text: "Contributing", link: "/development/contributing" },
    { text: "Extension", link: "/development/extension" },
    { text: "Plugin", link: "/development/plugin" },
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
