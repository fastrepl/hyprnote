## Persister Patterns

Three main patterns are used depending on data complexity:

- **JSON File** (`createJsonFilePersister`): Single-table data (calendar, events, templates, chat-shortcuts)
- **Markdown Dir** (`createMarkdownDirPersister`): Entity data with frontmatter (human, organization, prompts)
- **Collector** (`createCollectorPersister`): Multi-table data with complex relationships (session, chat)

## File Naming Conventions

### All Persisters

- `index.ts`: Controls load/save behavior, exports single hook.
- `persister.ts`: Creates persister with factory configuration. Should be thin—delegate logic to other files.

### JSON File Pattern (calendar, events, templates, chat-shortcuts, values)

Only needs `index.ts` + `persister.ts`. Configuration-only, no transform needed.

### Markdown Dir Pattern (human, organization, prompts)

- `changes.ts`: Path parsing for file watcher.
  - Export `parseXxxIdFromPath(path) → string | null`
  - Note: Change detection is handled by the factory via `changedTables[tableName]`
- `transform.ts`: Bidirectional conversion between frontmatter/body and store format.
  - Export `xxxToFrontmatter(storage) → { frontmatter, body }`
  - Export `frontmatterToXxx(frontmatter, body) → storage`

### Collector Pattern (session, chat)

- `types.ts`: Type definitions for JSON file structures and loaded data types (type-only, no functions).
- `load.ts`: Reads from filesystem and parses data (filesystem → store).
  - Export `loadAllXxxData(dataDir) → LoadedData`
  - Export `loadSingleXxx(dataDir, id) → LoadedData`
- `collect.ts`: Extracts store data and prepares write operations (store → filesystem).
  - Export `collectXxxWriteOps(store, tables, dataDir, changedIds?) → CollectorResult`
- `changes.ts`: Change detection with relationship traversal and deletion tracking.
  - Export `parseXxxIdFromPath(path) → string | null`
  - Export `getChangedXxxIds(tables, changedTables) → Set<string> | undefined` — needed for resolving child table changes to parent entity
  - Export `createXxxDeletionMarker(store) → DeletionMarker`
- `ops.ts`: External mutation API (session-specific, for folder/session operations).

## Change Detection Location

- **JSON File**: Handled entirely in factory (trivial single-table check via `extractChangedTables`).
- **Markdown Dir**: `changes.ts` with path parser; factory handles generic row-level change detection.
- **Collector**: `changes.ts` with full change detection logic including relationship traversal (e.g., finding session from participant change).

## Startup Modes

- `startAutoSave()`: Save-only (most persisters). Store changes trigger filesystem writes.
- `startAutoLoad()`: Load-only (local). Filesystem changes trigger store updates.
- `startAutoPersisting()`: Both save/load. Loads first, then auto-save on store changes and auto-load on filesystem changes.

## Notes

- `local` is the SQLite-backed source of truth; other persisters sync data to filesystem for external access.
- `session` uses bidirectional persistence and handles folder_id (derived from file paths).
- `settings` uses a separate store schema from the main store.

## Testing

- Shared test utilities are in `testing/mocks.ts`.
- Use `setupJsonFilePersisterMocks()` for JSON file persister tests.
- Use `setupMarkdownDirPersisterMocks()` for markdown dir persister tests.
