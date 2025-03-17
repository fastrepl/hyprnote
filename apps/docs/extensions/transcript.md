---
title: Transcript
description: Dictates your meeting content in real time in your desired language. If needed, you can manually edit the text and correct speaker names.
source: https://github.com/fastrepl/hypr/tree/main/extensions/transcript
implemented: true
default: true
cloud_only: false
plugins: [listener, db]
tags: [local, realtime, STT, speech-to-text, AI]
---
<TitleWithContributors :title="$frontmatter.title" />

**{{ $frontmatter.description }}**

<ExtensionTags :frontmatter="$frontmatter" />

## Resources

<ul>
  <li><a :href="$frontmatter.source">Github source</a></li>
  <li v-for="plugin in $frontmatter.plugins"><PluginLink :plugin /></li>
</ul>
