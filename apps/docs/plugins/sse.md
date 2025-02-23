---
title: SSE
description: Server-Sent Events
id: sse
---

# {{ $frontmatter.title }}

**{{ $frontmatter.description }}**

## Notes

- Intended to be used only in [`@hypr/extension-utils`](https://github.com/fastrepl/hyprnote/blob/main/extensions/utils/src/index.ts)

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
