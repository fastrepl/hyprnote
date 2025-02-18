---
title: Linear
description: Create a linear issue from the meeting
source: https://github.com/fastrepl/hypr/tree/main/extensions/linear
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
