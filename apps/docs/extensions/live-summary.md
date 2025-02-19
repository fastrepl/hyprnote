---
title: Live Summary
description: Show a live summary during the meeting
source: https://github.com/fastrepl/hypr/tree/main/extensions/live-summary
implemented: true
default: true
cloudOnly: false
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
