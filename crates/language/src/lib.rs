mod error;
pub use error::*;

#[cfg(feature = "detect")]
mod detect;
#[cfg(feature = "detect")]
pub use detect::detect;

#[cfg(feature = "whisper")]
mod whisper;

#[cfg(feature = "deepgram")]
mod deepgram;

#[cfg(feature = "tantivy")]
mod tantivy;

use std::str::FromStr;

pub use codes_iso_639::part_1::LanguageCode as ISO639;

#[derive(Debug, Clone, PartialEq, schemars::JsonSchema)]
pub struct Language {
    #[schemars(with = "String", regex(pattern = "^[a-zA-Z]{2}$"))]
    iso639: ISO639,
}

impl Language {
    pub fn new(iso639: ISO639) -> Self {
        Self { iso639 }
    }

    pub fn iso639(&self) -> ISO639 {
        self.iso639
    }
}

impl specta::Type for Language {
    fn inline(_: &mut specta::TypeCollection, _: specta::Generics) -> specta::DataType {
        specta::DataType::Primitive(specta::datatype::PrimitiveType::String)
    }
}

impl Default for Language {
    fn default() -> Self {
        Self { iso639: ISO639::En }
    }
}

impl From<ISO639> for Language {
    fn from(language: ISO639) -> Self {
        Self { iso639: language }
    }
}

impl std::ops::Deref for Language {
    type Target = ISO639;

    fn deref(&self) -> &Self::Target {
        &self.iso639
    }
}

impl serde::Serialize for Language {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.iso639().code())
    }
}

impl<'de> serde::Deserialize<'de> for Language {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let code = String::deserialize(deserializer)?;
        let iso639 = ISO639::from_str(&code).map_err(serde::de::Error::custom)?;
        Ok(iso639.into())
    }
}
