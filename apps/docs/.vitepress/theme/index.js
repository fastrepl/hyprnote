import FloatingVue from "floating-vue";
import DefaultTheme from "vitepress/theme";

import "virtual:uno.css";
import "floating-vue/dist/style.css";
import "./global.css";

import Card from "../components/Card.vue";
import Contributors from "../components/Contributors.vue";
import Image from "../components/Image.vue";
import PluginCommands from "../components/PluginCommands.vue";
import PluginLink from "../components/PluginLink.vue";
import PluginSourceList from "../components/PluginSourceList.vue";
import PluginsTable from "../components/PluginsTable.vue";
import TitleWithContributors from "../components/TitleWithContributors.vue";

/** @type {import('vitepress').Theme} */
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(FloatingVue);
    app.component("Card", Card);
    app.component("Contributors", Contributors);
    app.component("Image", Image);
    app.component("PluginCommands", PluginCommands);
    app.component("PluginLink", PluginLink);
    app.component("PluginSourceList", PluginSourceList);
    app.component("PluginsTable", PluginsTable);
    app.component("TitleWithContributors", TitleWithContributors);
  },
};
