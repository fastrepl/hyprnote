# Miscellaneous

## Testing all plugins

```bash
cargo metadata --format-version=1 --no-deps \
  | jq -r '.packages[].name' \
  | grep '^tauri-plugin-' \
  | xargs -n1 cargo test --package
```
