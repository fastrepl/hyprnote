# Extension Development

## Preview

### Storybook

```bash
pnpm -F @hypr/<EXTENSION_NAME> preview
```

### Mocking

We use `MSW` for network calls, and `@tauri-apps/api/mocks` for Tauri commands.

## Assets

Follow this naming convention for assets:

```bash
/<EXTENSION_NAME>/assets/<EXTENSION_NAME>-<ASSET_NAME>.<ASSET_TYPE>
```
