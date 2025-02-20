# Extension Development

## Interface

All extension should **default-export** [Extension](https://github.com/hyprnote/hypr/blob/main/extensions/types.ts) interface.

## Preview

### Storybook

```bash
pnpm -F @hypr/<EXTENSION_NAME> preview
```

### Mocking

We use `MSW` for network calls, and `@tauri-apps/api/mocks` for Tauri commands.

## Assets

### Where to store

```lua
<EXTENSION_FOLDER>/assets/<ASSET_NAME>
```

### How to use

Follow this naming convention for assets:

```html
<img src="/<EXTENSION_NAME>/assets/<EXTENSION_NAME>-<ASSET_NAME>" />
```
