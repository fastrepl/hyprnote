---
title: Notion
description: Create a notion page from the meeting
source: https://github.com/fastrepl/hypr/tree/main/extensions/notion
implemented: false
default: false
cloudOnly: true
plugins:
  - listener
  - db
---

# {{ $frontmatter.title }}

**{{ $frontmatter.description }}**

<ExtensionTags :frontmatter="$frontmatter" />

## Reference

<ul>
  <li><a :href="$frontmatter.source">Github source</a></li>
  <li v-for="plugin in $frontmatter.plugins"><PluginLink :plugin /></li>
</ul>
