import DefaultTheme from "vitepress/theme";
import FloatingVue from "floating-vue";

import "virtual:uno.css";
import "floating-vue/dist/style.css";

import ExtensionsTable from "../components/ExtensionsTable.vue";
import PluginsTable from "../components/PluginsTable.vue";

/** @type {import('vitepress').Theme} */
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(FloatingVue);
    app.component("ExtensionsTable", ExtensionsTable);
    app.component("PluginsTable", PluginsTable);
  },
};
