use anyhow::Result;

pub mod ops;
pub mod types;

#[derive(Debug)]
pub struct Migration {
    pub version: i64,
    pub description: &'static str,
    pub sql: &'static str,
    pub kind: MigrationKind,
}

#[derive(Debug)]
pub enum MigrationKind {
    Up,
    Down,
}

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "v0",
        sql: include_str!("../migrations/20241213001503_v0.up.sql"),
        kind: MigrationKind::Up,
    }]
}

pub fn export_ts_types_to(path: impl AsRef<std::path::Path>) -> Result<()> {
    let mut collection = specta_util::TypeCollection::default();
    types::register_all(&mut collection);

    let language = specta_typescript::Typescript::default()
        .header("// @ts-nocheck\n\n")
        .formatter(specta_typescript::formatter::prettier)
        .bigint(specta_typescript::BigIntExportBehavior::Number);

    collection.export_to(language, path)?;
    Ok(())
}
