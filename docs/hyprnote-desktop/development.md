# Development

## Plugin

### Creating a plugin

If you want to create a plugin for `listener`, you can use the following command:

```bash
npx @tauri-apps/cli plugin new listener \
--no-example \
--directory ./plugins/listener
```

### Testing all plugins

```bash
cargo metadata --format-version=1 --no-deps \
  | jq -r '.packages[].name' \
  | grep '^tauri-plugin-' \
  | xargs -P 0 -n1 cargo test --package
```
