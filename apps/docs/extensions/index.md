<script setup>
import { data as extensions } from '../data/extensions.data'
</script>

# Extensions

<ul>
  <li v-for="extension in extensions">
    <a :href="extension.url">{{ extension.frontmatter.title }}</a>
  </li>
</ul>
