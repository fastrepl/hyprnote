# Folder Plugin

## Key Invariants

### Session Detection
- A directory is a **session** if it contains `_meta.json`
- A directory is a **folder** if it does NOT contain `_meta.json` and is NOT a UUID
- `_memo.md` is NOT used for detection (it may not exist for sessions without content)

### Directory Structure
```
sessions/
  <uuid>/           # session at root (folder_id = "")
    _meta.json
  work/             # folder (folder_id = "work")
    <uuid>/         # session in folder (folder_id = "work")
      _meta.json
    projects/       # nested folder (folder_id = "work/projects")
      <uuid>/       # session (folder_id = "work/projects")
```

### No `_default` Folder
- Sessions without a folder live directly under `sessions/`
- Empty `folder_id` = session at root level
- Migration runs on plugin init (`migration::run` in `lib.rs`)
- Migration moves legacy `_default/<uuid>` → `<uuid>`, then removes empty `_default/`

### Folder ID Format
- Always use `/` as separator (regardless of OS)
- Convert to platform path (`sep()`) only at filesystem boundary
- Folder ID is the path relative to `sessions/` (e.g., `"work/projects"`)

### Source of Truth
- **Filesystem location IS the folder assignment**
- `folder_id` is NOT stored in `_meta.json`
- On load: derive `folder_id` from parent directory path
- On save: look up `folder_id` from store to determine write location

