---
title: Template
description: Template plugin
id: template
---

# {{ $frontmatter.title }}

**{{ $frontmatter.description }}**

Powered by [minijinja](https://docs.rs/minijinja/latest/minijinja/).

## Reference

<ul>
  <li><PluginBindingLink :id="$frontmatter.id" /></li>
  <li><a :href="`https://github.com/fastrepl/hypr/tree/main/plugins/template/src`">Additional template filters and functions</a></li>
</ul>
