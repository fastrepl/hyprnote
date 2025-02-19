<script setup>
import { data } from "../data/extensions.data.mts";
</script>

# Extensions

`Extension` is pluggable module that can be used to extend the functionality of `Hyprnote`.

Since most of the complex logics are extracted as [plugins](/plugins/index.md), `Extension` is small and focused.
Also, it is 100% `Typescript` + `React`. So feel free to share your ideas and [contribute new extension](/development/extension).

<ExtensionsTable :data="data" />

https://cdn.crabnebula.app/download/fastrepl/hypr/latest/dmg-aarch64