## Persister Patterns

Three main patterns are used depending on data complexity:

- **JSON File** (`createJsonFilePersister` in `json-file.ts`): Single-table data (calendar, events, templates, chat-shortcuts)
- **Frontmatter Entity** (`createMarkdownDirPersister` in `frontmatter-entity.ts`): Entity data with frontmatter (human, organization, prompts)
- **Batch Writer** (`createCollectorPersister` in `batch-writer.ts`): Multi-table data with complex relationships (session, chat)

## File Naming Conventions

- `index.ts`: Controls load/save behavior, exports single hook.
- `persister.ts`: Defines both load and save regardless of actual usage.
- `load.ts`: Reads from filesystem and parses data into store-compatible format (filesystem → store).
- `collect.ts`: Extracts store data and prepares filesystem write operations (store → filesystem).
- `transform.ts`: Shared types and bidirectional conversion between file format and store format.
- `ops.ts`: External mutation API for folder operations (used in folder/).

## Startup Modes

- `startAutoSave()`: Save-only (most persisters). Store changes trigger filesystem writes.
- `startAutoLoad()`: Load-only (folder, local). Filesystem changes trigger store updates.
- `startAutoPersisting()`: Both save and load (settings).

## Notes

- `local` is the SQLite-backed source of truth; other persisters sync data to filesystem for external access.
- `folder` is load-only (syncs filesystem → store for folders and session folder_id).
- `settings` uses a separate store schema from the main store.

## Testing

- Shared test utilities are in `testing/mocks.ts`.
- Use `setupJsonFilePersisterMocks()` for JSON file persister tests.
- Use `setupMarkdownDirPersisterMocks()` for markdown dir persister tests.
