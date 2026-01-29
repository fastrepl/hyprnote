mod runner;
mod utils;

use std::future::Future;
use std::path::Path;
use std::pin::Pin;

use hypr_version::Version;

use crate::Result;
use crate::version::version_from_name;

pub use runner::run;

pub trait Migration: Send + Sync {
    fn version(&self) -> &'static Version;
    fn run<'a>(&self, base_dir: &'a Path) -> Pin<Box<dyn Future<Output = Result<()>> + Send + 'a>>;
}

macro_rules! migrations {
    ($($module:ident),* $(,)?) => {
        $(mod $module;)*

        fn all_migrations() -> Vec<&'static dyn Migration> {
            vec![$(&$module::Migrate),*]
        }

        pub fn latest_migration_version() -> &'static Version {
            all_migrations().into_iter().map(|m| m.version()).max().expect("at least one migration must exist")
        }
    };
}

migrations! {
    v1_0_2_nightly_3_move_uuid_folders,
    v1_0_2_nightly_4_rename_transcript,
    v1_0_2_nightly_14_extract_from_sqlite,
}
