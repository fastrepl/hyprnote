---
Note that DECISIONS file is not for writing open questions. This is only for documenting the decisions we agreed.
---

## Migration Model

**Decision**: Operation-based migrations

Each migration is a function that receives `base_dir: &Path` and performs whatever operations needed:

```rust
pub struct Migration {
    pub name: &'static str,
    pub from: SchemaVersion,
    pub to: SchemaVersion,
    pub run: fn(&Path) -> Result<()>,
}
```

**Rationale**:
- Migrations are diverse (SQLite extraction vs file rename vs frontmatter transform)
- Simple and flexible - no artificial constraints
- Can add structure later if patterns emerge

## Migration Ordering

**Decision**: Use `semver::Version` for app version-based migrations

Use the `semver` crate. Migrations are tied to actual Hyprnote app versions, not arbitrary schema numbers. Not every app version has a migration - only versions that need data structure changes (checkpoints).

```rust
// https://docs.rs/semver/latest/semver/
use semver::Version;

Migration::new(
    "extract_from_sqlite",
    Version::parse("1.0.1").unwrap(),
    Version::parse("1.0.2").unwrap(),
    |base_dir| { ... }
)
```

## App Version Source

**Decision**: Get current app version from tauri's `Config.version`

See https://docs.rs/tauri/latest/tauri/struct.Config.html#structfield.version

## Fresh Install vs Migration Decision Logic

```
if .schema/version exists:
    current_version = parse(.schema/version)
    run migrations where from >= current_version
else if db.sqlite exists:
    # Old user before version tracking
    current_version = "1.0.1"  # or earliest known version
    run migrations where from >= current_version
else:
    # Fresh install, no data to migrate
    write app_version to .schema/version
    skip all migrations
```

## Runner Algorithm

1. Determine `current_version` using decision logic above
2. Get `app_version` from tauri Config (https://docs.rs/tauri/latest/tauri/struct.Config.html#structfield.version)
3. Collect all migrations where `from >= current_version && to <= app_version`
4. Sort by `from` using semver's `Ord`
5. Run in order
6. Write `app_version` to `.schema/version`

## Testing

Tests should make migration behavior explicit:

```rust
#[test]
fn fresh_install_skips_all_migrations() {
    // Given: empty base_dir (no .schema/version, no db.sqlite)
    // When: app v1.0.3 runs
    // Then: no migrations run, .schema/version written as "1.0.3"
}

#[test]
fn old_user_without_version_file_but_has_sqlite() {
    // Given: db.sqlite exists, no .schema/version
    // When: app v1.0.3 runs
    // Then: treat as v1.0.1, run all migrations from 1.0.1
}

#[test]
fn user_on_1_0_1_upgrading_to_1_0_3() {
    // Given: .schema/version = "1.0.1"
    // When: app v1.0.3 runs
    // Then: migrations 1.0.1→1.0.2 and 1.0.2→1.0.3 are applied
}

#[test]
fn user_on_1_0_2_upgrading_to_1_0_3() {
    // Given: .schema/version = "1.0.2"
    // When: app v1.0.3 runs
    // Then: only migration 1.0.2→1.0.3 is applied
}

#[test]
fn user_already_on_latest() {
    // Given: .schema/version = "1.0.3"
    // When: app v1.0.3 runs
    // Then: no migrations run
}
```
