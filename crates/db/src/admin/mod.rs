mod migrations;
mod ops;
mod types;

pub use migrations::*;
pub use ops::*;
pub use types::*;

#[cfg(debug_assertions)]
mod seed;
#[cfg(debug_assertions)]
pub use seed::*;

#[macro_export]
macro_rules! admin_common_derives {
    ($item:item) => {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        $item
    };
}
