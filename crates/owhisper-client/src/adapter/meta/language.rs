use anlg_language::{ISO639, Language};

// https://dev.meta.ai/docs/speech-to-text — `languageBias` takes English names.
const LANGUAGES: &[(ISO639, &str)] = &[
    (ISO639::Ar, "Arabic"),
    (ISO639::Bn, "Bengali"),
    (ISO639::Nl, "Dutch"),
    (ISO639::En, "English"),
    (ISO639::Fr, "French"),
    (ISO639::De, "German"),
    (ISO639::He, "Hebrew"),
    (ISO639::Hi, "Hindi"),
    (ISO639::Id, "Indonesian"),
    (ISO639::It, "Italian"),
    (ISO639::Ja, "Japanese"),
    (ISO639::Kn, "Kannada"),
    (ISO639::Ko, "Korean"),
    (ISO639::Ms, "Malay"),
    (ISO639::Zh, "Mandarin Chinese"),
    (ISO639::Mr, "Marathi"),
    (ISO639::Pl, "Polish"),
    (ISO639::Pt, "Portuguese"),
    (ISO639::Es, "Spanish"),
    (ISO639::Tl, "Tagalog"),
    (ISO639::Ta, "Tamil"),
    (ISO639::Te, "Telugu"),
    (ISO639::Th, "Thai"),
    (ISO639::Tr, "Turkish"),
    (ISO639::Vi, "Vietnamese"),
];

fn name_for(language: &Language) -> Option<&'static str> {
    let code = language.iso639();
    LANGUAGES
        .iter()
        .find(|(iso, _)| *iso == code)
        .map(|(_, name)| *name)
}

pub(super) fn all_supported(languages: &[Language]) -> bool {
    languages
        .iter()
        .all(|language| name_for(language).is_some())
}

pub(super) fn language_bias(languages: &[Language]) -> Vec<String> {
    let mut names: Vec<String> = Vec::new();
    for name in languages.iter().filter_map(name_for) {
        if !names.iter().any(|known| known == name) {
            names.push(name.to_string());
        }
    }
    names
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bias_uses_english_names_and_dedups_regions() {
        let langs: Vec<Language> = vec![
            "en-US".parse().unwrap(),
            "en-GB".parse().unwrap(),
            "zh-CN".parse().unwrap(),
        ];
        assert_eq!(language_bias(&langs), vec!["English", "Mandarin Chinese"]);
    }

    #[test]
    fn support_requires_every_language_documented() {
        let pl: Language = "pl".parse().unwrap();
        let sw: Language = "sw".parse().unwrap();
        assert!(all_supported(&[]));
        assert!(all_supported(std::slice::from_ref(&pl)));
        assert!(!all_supported(&[pl, sw]));
    }
}
