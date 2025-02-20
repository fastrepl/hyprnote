---
title: Template
description: Template engine for LLM prompting
id: template
---

# {{ $frontmatter.title }}

**{{ $frontmatter.description }}**

Powered by [minijinja](https://docs.rs/minijinja/latest/minijinja/), with [preserve_order](https://docs.rs/minijinja/latest/minijinja/index.html#optional-features), [json](https://docs.rs/minijinja/latest/minijinja/index.html#optional-features) and [pycompat](https://docs.rs/minijinja-contrib/latest/minijinja_contrib/pycompat/fn.unknown_method_callback.html) enabled.

## Usage

Note that template should be registered before rendering. Usually, it is extension's responsibility to do so.

```typescript
import { commands as templateCommands } from "@hypr/plugin-template";
await templateCommands.registerTemplate("<TEMPLATE_NAME>", "<TEMPLATE_CONTENT>");
const rendered = await templateCommands.render("<TEMPLATE_NAME>", {});
```

## Resources

<ul>
  <PluginSourceList :id="$frontmatter.id" />
  <li><a :href="`https://github.com/fastrepl/hypr/tree/main/plugins/template/src`">Additional template filters and functions</a></li>
</ul>
