---
title: Template
description: Template engine for LLM prompting
id: template
---

# {{ $frontmatter.title }}

**{{ $frontmatter.description }}**

Powered by [minijinja](https://docs.rs/minijinja/latest/minijinja/), with [preserve_order](https://docs.rs/minijinja/latest/minijinja/index.html#optional-features), [json](https://docs.rs/minijinja/latest/minijinja/index.html#optional-features) and [pycompat](https://docs.rs/minijinja-contrib/latest/minijinja_contrib/pycompat/fn.unknown_method_callback.html) enabled.

Also, there are [a few built-in filters and functions](https://github.com/fastrepl/hypr/tree/main/plugins/template/src/engine.rs) implemented that are specific to Hyprnote.

## Notes

Template must be registered before rendering. 

```ts
await commands.registerTemplate("<TEMPLATE_NAME>", "<TEMPLATE_CONTENT>");
const rendered = await commands.render("<TEMPLATE_NAME>", { a: 1 });
```

For templates included in [extensions](/extensions/index.md), [`init`](https://github.com/fastrepl/hyprnote/blob/main/extensions/types.ts) function is perfect place to register them.

```ts
const extension: Extension = {
  init: async (app) => {
    await app.registerTemplate("<TEMPLATE_NAME>", "<TEMPLATE_CONTENT>");
  }
};
```

Templates included in [plugins](/plugins/index.md) are automatically registered on app initialization though `register_template` provided by `TemplatePluginExt`.

## Commands

```ts-vue
import { commands } from "{{ typedoc.name }}";
```

<PluginCommands :typedoc="typedoc" />

## Resources

<ul>
  <PluginSourceList :id="$frontmatter.id" />
</ul>

<script setup lang="ts">
  import { useData } from "vitepress";
  import { data } from "../data/typedoc.data.mts";
  const { frontmatter } = useData();
  const typedoc = data[frontmatter.value.id];
</script>
