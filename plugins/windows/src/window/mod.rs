mod v0;
mod v1;

pub type AppWindow = v0::AppWindow;

pub trait WindowImpl:
    std::fmt::Display
    + std::str::FromStr
    + std::fmt::Debug
    + Clone
    + serde::Serialize
    + serde::de::DeserializeOwned
    + specta::Type
    + PartialEq
    + Eq
    + std::hash::Hash
    + Send
    + Sync
    + 'static
{
    fn label(&self) -> String {
        self.to_string()
    }

    fn title(&self) -> String;
}
