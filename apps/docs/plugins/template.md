---
title: Template
description: Template plugin
package: "@hypr/plugin-template"
bindings: https://github.com/fastrepl/hypr/blob/main/plugins/template/generated/bindings.ts
---

# {{ $frontmatter.title }}

**{{ $frontmatter.description }}**


## Reference

<ul>
  <li><a :href="$frontmatter.bindings"><code>{{ $frontmatter.package }}</code> Typescript API</a></li>
</ul>
