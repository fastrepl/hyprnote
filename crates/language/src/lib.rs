mod error;
pub use error::*;

#[cfg(feature = "detect")]
mod detect;
#[cfg(feature = "detect")]
pub use detect::detect;

#[cfg(feature = "whisper")]
mod whisper;

use std::str::FromStr;

pub use codes_iso_639::part_1::LanguageCode as ISO639;

#[derive(Debug, Clone, PartialEq, schemars::JsonSchema)]
pub struct Language {
    #[schemars(
        with = "String",
        regex(pattern = "^[a-zA-Z]{2}(-[a-zA-Z]{2,4})?(-[a-zA-Z]{2})?$")
    )]
    iso639: ISO639,
    #[schemars(skip)]
    region: Option<String>,
}

impl Language {
    pub fn new(iso639: ISO639) -> Self {
        Self {
            iso639,
            region: None,
        }
    }

    pub fn with_region(iso639: ISO639, region: impl Into<String>) -> Self {
        Self {
            iso639,
            region: Some(region.into()),
        }
    }

    pub fn iso639(&self) -> ISO639 {
        self.iso639
    }

    pub fn iso639_code(&self) -> &str {
        self.iso639.code()
    }

    pub fn region(&self) -> Option<&str> {
        self.region.as_deref()
    }

    pub fn bcp47(&self) -> String {
        match &self.region {
            Some(region) => format!("{}-{}", self.iso639.code(), region),
            None => self.iso639.code().to_string(),
        }
    }
}

fn extract_region(parts: &[&str]) -> Option<String> {
    for part in parts.iter().skip(1) {
        if part.len() == 2 && part.chars().all(|c| c.is_ascii_alphabetic()) {
            return Some(part.to_uppercase());
        }
    }
    None
}

impl specta::Type for Language {
    fn inline(_: &mut specta::TypeCollection, _: specta::Generics) -> specta::DataType {
        specta::DataType::Primitive(specta::datatype::PrimitiveType::String)
    }
}

impl Default for Language {
    fn default() -> Self {
        Self {
            iso639: ISO639::En,
            region: None,
        }
    }
}

impl From<ISO639> for Language {
    fn from(language: ISO639) -> Self {
        Self {
            iso639: language,
            region: None,
        }
    }
}

impl std::ops::Deref for Language {
    type Target = ISO639;

    fn deref(&self) -> &Self::Target {
        &self.iso639
    }
}

impl FromStr for Language {
    type Err = Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parts: Vec<&str> = s.split(['-', '_']).collect();

        if parts.is_empty() {
            return Err(Error::InvalidLanguageCode(s.to_string()));
        }

        let lang_part = parts[0].to_lowercase();
        let iso639 =
            ISO639::from_str(&lang_part).map_err(|_| Error::InvalidLanguageCode(s.to_string()))?;

        let region = extract_region(&parts);

        Ok(Self { iso639, region })
    }
}

impl serde::Serialize for Language {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.bcp47())
    }
}

impl<'de> serde::Deserialize<'de> for Language {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let code = String::deserialize(deserializer)?;
        code.parse().map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_iso639_only() {
        let lang: Language = "en".parse().unwrap();
        assert_eq!(lang.iso639(), ISO639::En);
        assert_eq!(lang.region(), None);
        assert_eq!(lang.bcp47(), "en");
    }

    #[test]
    fn test_parse_with_region() {
        let lang: Language = "en-US".parse().unwrap();
        assert_eq!(lang.iso639(), ISO639::En);
        assert_eq!(lang.region(), Some("US"));
        assert_eq!(lang.bcp47(), "en-US");
    }

    #[test]
    fn test_parse_with_underscore() {
        let lang: Language = "ja_JP".parse().unwrap();
        assert_eq!(lang.iso639(), ISO639::Ja);
        assert_eq!(lang.region(), Some("JP"));
        assert_eq!(lang.bcp47(), "ja-JP");
    }

    #[test]
    fn test_parse_with_script() {
        let lang: Language = "zh-Hans-CN".parse().unwrap();
        assert_eq!(lang.iso639(), ISO639::Zh);
        assert_eq!(lang.region(), Some("CN"));
        assert_eq!(lang.bcp47(), "zh-CN");
    }

    #[test]
    fn test_parse_korean_us() {
        let lang: Language = "ko-US".parse().unwrap();
        assert_eq!(lang.iso639(), ISO639::Ko);
        assert_eq!(lang.region(), Some("US"));
        assert_eq!(lang.bcp47(), "ko-US");
    }

    #[test]
    fn test_serde_roundtrip() {
        let lang: Language = "en-US".parse().unwrap();
        let json = serde_json::to_string(&lang).unwrap();
        assert_eq!(json, "\"en-US\"");

        let parsed: Language = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, lang);
    }

    #[test]
    fn test_serde_iso639_only() {
        let lang: Language = "ko".parse().unwrap();
        let json = serde_json::to_string(&lang).unwrap();
        assert_eq!(json, "\"ko\"");
    }

    #[test]
    fn test_backward_compat_from_iso639() {
        let lang: Language = ISO639::En.into();
        assert_eq!(lang.iso639(), ISO639::En);
        assert_eq!(lang.region(), None);
        assert_eq!(lang.bcp47(), "en");
    }
}
