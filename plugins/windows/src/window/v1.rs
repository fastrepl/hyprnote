use crate::WindowImpl;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(tag = "type", content = "value")]
pub enum AppWindow {
    #[serde(rename = "main")]
    Main,
    #[serde(rename = "settings")]
    Settings,
}

impl std::fmt::Display for AppWindow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Main => write!(f, "main"),
            Self::Settings => write!(f, "settings"),
        }
    }
}

impl std::str::FromStr for AppWindow {
    type Err = strum::ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "main" => return Ok(Self::Main),
            "settings" => return Ok(Self::Settings),
            _ => {}
        }

        Err(strum::ParseError::VariantNotFound)
    }
}

impl WindowImpl for AppWindow {
    fn title(&self) -> String {
        match self {
            Self::Main => "Hyprnote".into(),
            Self::Settings => "Settings".into(),
        }
    }
}
