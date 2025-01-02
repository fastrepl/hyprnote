mod migrations;
mod ops;
mod types;

pub use migrations::*;
pub use ops::*;
pub use types::*;

pub fn export_ts_types_to(path: impl AsRef<std::path::Path>) -> anyhow::Result<()> {
    let mut collection = specta_util::TypeCollection::default();
    types::register_all(&mut collection);

    let language = specta_typescript::Typescript::default()
        .header("// @ts-nocheck\n\n")
        .formatter(specta_typescript::formatter::prettier)
        .bigint(specta_typescript::BigIntExportBehavior::Number);

    collection.export_to(language, path)?;
    Ok(())
}
