# Extension Development

## File Structure (recommended)

```
extension-name/
├── .storybook/                     # Storybook configuration
├── assets/                         # Raw assets (images, videos)
├── public/                         # Static files served as-is
├── src/
│   ├── stories/                    # Storybook stories for components
│   │   ├── <widget-name-1>-1x1-1.stories.tsx
│   │   ├── <widget-name-1>-1x1-2.stories.tsx
│   │   ├── <widget-name-2>-2x2.stories.tsx
│   │   └── <widget-name-2>-full.stories.tsx
│   ├── widgets/                    # Widget implementations
│   │   ├── components/             # Shared components
│   │   │   └── <shared-component>.tsx
│   │   └── <widget-name-1>/        # Example widget 1 implementation
│   │   │   ├── 1x1-1.tsx           # First 1x1 layout widget
│   │   │   ├── 1x1-2.tsx           # Second 1x1 layout widget
│   │   │   └── index.tsx           # Widget group
│   │   └── <widget-name-2>/        
│   │       ├── 2x2.tsx             
│   │       ├── full.tsx            
│   │       └── index.tsx             
│   ├── globals.css                 # Global styles
│   ├── index.tsx                   # Extension entry point and initialization
│   ├── types.ts                    # Type definitions
│   └── utils.ts                    # Utility functions
├── config.json                     # Extension configuration
├── package.json                    # Dependencies and scripts
├── tailwind.config.ts              # Tailwind CSS configuration
└── tsconfig.json                   # TypeScript configuration
```

### Key Directories and Files

- **src/stories/**: Contains Storybook stories for testing widgets in isolation
- **src/widgets/**: Main widget implementations
  - **components/**: Reusable components shared across widgets
  - **\<widget-name\>/**: Specific widget implementation (e.g., live, replay)
- **src/types.ts**: TypeScript type definitions and interfaces
- **src/utils.ts**: Shared utility functions
- **config.json**: Extension metadata and configuration

## Interface

All extension must **default-export** [Extension](https://github.com/fastrepl/hyprnote/blob/main/extensions/types.ts) interface.

## Storybook

```bash
pnpm -F @hypr/<EXTENSION_NAME> preview
```

## Mocking

We use `MSW` for network calls, and `@tauri-apps/api/mocks` for Tauri commands.

## Assets

### Where to store

```lua
<EXTENSION_FOLDER>/assets/<ASSET_NAME>
```

### How to name

It's really simple.

```
<EXTENSION_NAME>-<ASSET_NAME>
```

For example, the `summary` extension has two assets:

- `summary-dynamic.gif`
- `summary-static.png`

### How to use

To use them, simply use the file name.

```html
<img src="/<FILE_NAME>" />
```

For example:

```html
<img src="/summary-dynamic.gif" />
```

## Troubleshooting

### Problem: Storybook add-ons could not be resolved while running `pnpm preview`

Solution: Delete `~/.pnp.cjs` that you find in your home directory. ([more](https://github.com/storybookjs/storybook/issues/20876#issuecomment-1501240993))
