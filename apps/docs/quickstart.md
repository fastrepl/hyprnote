<script setup>
    import { data } from "./data/contributors.data.mts"
</script>

<h1 class="flex items-center gap-2"><div class="i-heroicons-bolt-20-solid h-8 w-8"></div> Quickstart</h1>

Since `Hyprnote` is built with `local-first` in mind, **no signup is required** to get started.

<Contributors :data="data" />
