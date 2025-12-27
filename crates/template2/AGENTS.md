# General

- Edit templates only in `crates/template-assets/askama`.
- When input variables change, structs in `crates/template2/src` should be updated, and TS binding should be updated with `cargo test -p tauri-plugin-template`.

# Tooling

- If `cargo insta` is not available, run `cargo install cargo-insta` first.
- `cargo test -p template2 -q; cargo insta accept` combo is helpful to iteratively adjust template and get feedback from the snapshot.
