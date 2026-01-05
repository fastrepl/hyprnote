## File naming conventions

- `index.ts`: Controls load/save behavior, and should export single hook.
- `persister.ts`: Defines both load and save regardless of actual usage.
- `load.ts`: Reads from filesystem and parses data into store-compatible format (filesystem → store).
- `collect.ts`: Extracts store data and prepares filesystem write operations (store → filesystem).
- `transform.ts`: Bidirectional conversion between file format and store format (used by both load and collect).

## Notes

- `local.ts` and `settings.ts` do both save/load.
- `folder.ts` is used as load-only (syncs filesystem → store for folders and session folder_id).
- Other persisters are used as save-only for now.
