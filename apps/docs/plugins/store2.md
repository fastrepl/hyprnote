---
title: Store2
description: Simple persistent key-value store.
id: store2
---

# {{ $frontmatter.title }}

**{{ $frontmatter.description }}**

## Notes

- It's a wrapper around [official store plugin](https://v2.tauri.app/plugin/store/).

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
