---
title: Template
description: Template engine for LLM prompting
id: template
---

# {{ $frontmatter.title }}

**{{ $frontmatter.description }}**

Powered by [minijinja](https://docs.rs/minijinja/latest/minijinja/), with [preserve_order](https://docs.rs/minijinja/latest/minijinja/index.html#optional-features) and [pycompat](https://docs.rs/minijinja-contrib/latest/minijinja_contrib/pycompat/fn.unknown_method_callback.html) enabled.

## Reference

<ul>
  <li><PluginBindingLink :id="$frontmatter.id" /></li>
  <li><a :href="`https://github.com/fastrepl/hypr/tree/main/plugins/template/src`">Additional template filters and functions</a></li>
</ul>
