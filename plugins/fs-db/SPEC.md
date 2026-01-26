---
Note that SPEC file is not a implementation plan.
Use this for requirment understanding, not planning.
Ask followup question if needed, and update it if I explicitly agreed.
---

## Where we're heading

Mostly 2 things.

1. Lazy loading for some part of data.
    - We already doing some kind of file-system based storage thing.(See apps/desktop/src/store/tinybase) (like obsidian, but bit more complex because we have more richer/relational data)
    - Due to performance reason, we are migrating off from "loading everything to Tinybase" to "load only metadatas - for listing session purpose etc - and load detailed data on-demand.
    - **Scope**: Session is the priority (includes transcripts, enhanced_notes). Other entities (template, chat_shortcut, etc.) are not priority for lazy loading.

2. SQlite like migration support, for filesystem structure. (plugins/fs-db)
    - Migration run in `setup` of `plugins/fs-db/src/lib.rs`. Resolve past<>current-app-version and apply logic sequencly.
    - **Version tracking**: Global `.schema/version` file.
    - We need test to ensure the user's data is properly migrated to latest structure, when they do OTA update.
    - See https://github.com/fastrepl/hyprnote-data. Feel free to clone it in `/tmp/hyprnote-data` and inspect.
    - We might bring `plugins/importer/src/sources/hyprnote/v1_sqlite` into fs-db migration. That is level of flexibility we need.
    - **SQLite migration**: Users on old versions use `apps/desktop/src/store/tinybase/persister/local` (SQLite). Need migration path from SQLite to filesystem-first.

## Migration capabilities needed

Migrations need to support:
- Filesystem-level: rename, move, delete files/folders
- File-level: frontmatter transform, field addition/deletion (for md files)
- Data extraction: SQLite/TinyBase JSON → filesystem structure (for v0 → v1)
