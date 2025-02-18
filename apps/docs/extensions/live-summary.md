---
title: Live Summary
description: Show a live summary during the meeting
source: https://github.com/fastrepl/hypr/tree/main/extensions/live-summary
plugins:
  - listener
  - db
---

# {{ $frontmatter.title }}

**{{ $frontmatter.description }}**

## Reference

<ul>
  <li><a :href="$frontmatter.source">Github source</a></li>
  <li v-for="plugin in $frontmatter.plugins">
    <a :href="`/plugins/${plugin}`"><code>Plugin</code> {{ plugin }}</a>
  </li>
</ul>
