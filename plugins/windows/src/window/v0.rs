use crate::WindowImpl;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(tag = "type", content = "value")]
pub enum AppWindow {
    #[serde(rename = "main")]
    Main,
    #[serde(rename = "note")]
    Note(String),
    #[serde(rename = "human")]
    Human(String),
    #[serde(rename = "organization")]
    Organization(String),
    #[serde(rename = "finder")]
    Finder,
    #[serde(rename = "settings")]
    Settings,
    #[serde(rename = "video")]
    Video(String),
    #[serde(rename = "control")]
    Control,
}

impl std::fmt::Display for AppWindow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Main => write!(f, "main"),
            Self::Note(id) => write!(f, "note-{}", id),
            Self::Human(id) => write!(f, "human-{}", id),
            Self::Organization(id) => write!(f, "organization-{}", id),
            Self::Finder => write!(f, "finder"),
            Self::Settings => write!(f, "settings"),
            Self::Video(id) => write!(f, "video-{}", id),
            Self::Control => write!(f, "control"),
        }
    }
}

impl std::str::FromStr for AppWindow {
    type Err = strum::ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "main" => return Ok(Self::Main),
            "finder" => return Ok(Self::Finder),
            "settings" => return Ok(Self::Settings),
            _ => {}
        }

        if let Some((prefix, id)) = s.split_once('-') {
            match prefix {
                "note" => return Ok(Self::Note(id.to_string())),
                "human" => return Ok(Self::Human(id.to_string())),
                "organization" => return Ok(Self::Organization(id.to_string())),
                "video" => return Ok(Self::Video(id.to_string())),
                _ => {}
            }
        }

        Err(strum::ParseError::VariantNotFound)
    }
}

impl WindowImpl for AppWindow {
    fn title(&self) -> String {
        match self {
            Self::Main => "Hyprnote".into(),
            Self::Note(_) => "Note".into(),
            Self::Human(_) => "Human".into(),
            Self::Organization(_) => "Organization".into(),
            Self::Finder => "Finder".into(),
            Self::Settings => "Settings".into(),
            Self::Video(_) => "Video".into(),
            Self::Control => "Control".into(),
        }
    }
}
