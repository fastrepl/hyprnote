---
title: Twenty
description: Twenty CRM integration
source: https://github.com/fastrepl/hypr/tree/main/extensions/twenty
implemented: true
default: false
cloud_only: false
plugins: [listener, db, windows]
tags: [CRM]
---
<TitleWithContributors :title="$frontmatter.title" />

**{{ $frontmatter.description }}**

<ExtensionTags :frontmatter="$frontmatter" />

<Image alt="Twenty Widget" src="/extensions/twenty.png" imageClass="mt-6 max-w-[360px]" />

## Resources

<ul>
  <li><a :href="$frontmatter.source">Github source</a></li>
  <li v-for="plugin in $frontmatter.plugins"><PluginLink :plugin /></li>
</ul>
