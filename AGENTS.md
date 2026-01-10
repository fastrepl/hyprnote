---
alwaysApply: true
---

# Formatting

- Format using `dprint fmt` from the root. Do not use `cargo fmt`.
- Run it after you make changes.

# Typescript

- Avoid creating a bunch of types/interfaces if they are not shared. Especially for function props. Just inline them.
- After some amount of TypeScript changes, run `pnpm -r typecheck`.

# Rust

- After some amount of Rust changes, run `cargo check`.

# Mutation

- Never do manual state management for form/mutation. Things like setError is anti-pattern. use useForm(from tanstack-form) and useQuery/useMutation(from tanstack-query) for 99% cases.

# Comments

- By default, avoid writing comments at all.
- If you write one, it should be about "Why", not "What".

# Misc

- Do not create summary docs or example code file if not requested. Plan is ok.
- If there are many classNames and they have conditional logic, use `cn` (import it with `import { cn } from "@hypr/utils"`). It is similar to `clsx`. Always pass an array. Split by logical grouping.
- Use `motion/react` instead of `framer-motion`.

# TinyBase Persisters

## Patterns

Three main patterns exist in `apps/desktop/src/store/tinybase/persister`:

1. **JSON File** (calendar, events, templates, chat-shortcuts): Single-table data stored as JSON
2. **Markdown Dir** (human, organization, prompts): Entity data with frontmatter, one file per entity
3. **Collector** (session, chat): Multi-table data with complex relationships

Special cases with justified deviations:
- **settings**: Uses `createPersisterBuilder` + transform.ts (separate schema, Tauri plugin API, bidirectional sync)
- **local**: Uses SQLite backend (source of truth, CRDT merging, complex migrations)
- **values**: Uses Tauri commands (simple key-value storage)

## Naming Conventions

### Function Naming

Collector Pattern (load.ts):
- `loadAll{EntityPlural}(dataDir)` → `Promise<Loaded{Entity}Data>`
- `loadSingle{Entity}(dataDir, id)` → `Promise<Loaded{Entity}Data>`
- `createEmptyLoaded{Entity}Data()` → empty data structure

Collector Pattern (changes.ts):
- `parse{EntityType}IdFromPath(path)` → `string | null`
- `getChanged{Entity}Ids(tables, changedTables)` → `{Entity}ChangeResult | undefined`
- `create{Entity}DeletionMarker(store)` → `DeletionMarker`

Markdown Dir Pattern (transform.ts):
- `{entity}ToFrontmatter(storage)` → `{ frontmatter, body }`
- `frontmatterTo{Entity}(frontmatter, body)` → storage

### Type Naming

- File format types: `{Entity}Json`, `{Entity}MetaJson`
- Loaded data types: `Loaded{Entity}Data`
- Entity with ID types: `{Entity}Data`
- Change result types: `{Entity}ChangeResult`

## Startup Modes

| Persister | Mode | Justification |
|-----------|------|---------------|
| Most persisters | `startAutoSave()` | Filesystem is export format |
| local | `load()` → `startAutoLoad()` | SQLite is source of truth |
| settings | `startAutoPersisting()` | Bidirectional sync needed |
| values | `load()` → `startAutoSave()` | Needs initial state, then save-only |

## Error Handling Pattern

```typescript
const LABEL = "{Entity}Persister";

try {
  // operation
} catch (error) {
  if (!isFileNotFoundError(error)) {
    console.error(`[${LABEL}] Failed to {operation}:`, error);
  }
  return createEmptyLoaded{Entity}Data();
}
```
