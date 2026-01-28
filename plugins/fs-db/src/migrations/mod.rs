mod runner;
mod utils;

use std::future::Future;
use std::path::Path;
use std::pin::Pin;

use hypr_version::Version;

use crate::Result;
use crate::version::version_from_name;

pub use runner::run;

type MigrationFn = for<'a> fn(&'a Path) -> Pin<Box<dyn Future<Output = Result<()>> + Send + 'a>>;

struct Migration {
    to: &'static Version,
    run: MigrationFn,
}

macro_rules! migrations {
    ($($module:ident),* $(,)?) => {
        $(mod $module;)*

        fn all_migrations() -> Vec<Migration> {
            vec![$(Migration { to: $module::version(), run: $module::run }),*]
        }
    };
}

migrations! {
    v1_0_2_nightly_3_move_uuid_folders,
    v1_0_2_nightly_4_rename_transcript,
    v1_0_2_nightly_14_extract_from_sqlite,
}
