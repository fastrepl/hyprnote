<script setup>
import { data } from "../data/plugins.data.mts";
</script>

# Plugins

Every `Plugin` in `Hyprnote` is actually a [Tauri plugin](https://v2.tauri.app/develop/plugins).

Most likely, you'll be interested in plugins when you're **developing an `extension`** and want to use **TypeScript bindings** exposed by specific `plugin`.

Unlike [extensions](/extensions/index.md), all plugins are **enabled by default**. The only exception is platform-specific plugins like [apple-calendar](/plugins/apple-calendar).

<PluginsTable :data="data" />
