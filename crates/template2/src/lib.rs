pub mod enhance;
pub mod title;

pub use enhance::*;
pub use title::*;

#[macro_export]
macro_rules! common_derives {
    ($item:item) => {
        #[derive(Clone, serde::Deserialize, serde::Serialize, specta::Type)]
        $item
    };
}
