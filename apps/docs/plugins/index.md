<script setup>
import { data as plugins } from '../data/plugins.data'
</script>

# Plugins

<ul>
  <li v-for="plugin in plugins">
    <a :href="plugin.url">{{ plugin.frontmatter.title }}</a>
  </li>
</ul>
