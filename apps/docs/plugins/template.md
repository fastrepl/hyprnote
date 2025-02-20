---
title: Template
description: Template engine for LLM prompting
id: template
---

# {{ $frontmatter.title }}

**{{ $frontmatter.description }}**

Powered by [minijinja](https://docs.rs/minijinja/latest/minijinja/), with [preserve_order](https://docs.rs/minijinja/latest/minijinja/index.html#optional-features), [json](https://docs.rs/minijinja/latest/minijinja/index.html#optional-features) and [pycompat](https://docs.rs/minijinja-contrib/latest/minijinja_contrib/pycompat/fn.unknown_method_callback.html) enabled.

## Usage

```typescript
import { commands as templateCommands } from "@hypr/plugin-template";
const rendered = await templateCommands.rendered(name, data);
```

## Resources

<ul>
  <PluginSourceList :id="$frontmatter.id" />
  <li><a :href="`https://github.com/fastrepl/hypr/tree/main/plugins/template/src`">Additional template filters and functions</a></li>
</ul>
