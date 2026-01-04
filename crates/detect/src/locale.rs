#[cfg(target_os = "macos")]
pub fn get_preferred_languages() -> Vec<String> {
    use objc2_foundation::NSLocale;

    let languages = unsafe { NSLocale::preferredLanguages() };
    languages.iter().map(|s| s.to_string()).collect()
}

#[cfg(target_os = "macos")]
pub fn get_current_locale_identifier() -> String {
    use objc2_foundation::NSLocale;

    let locale = unsafe { NSLocale::currentLocale() };
    locale.localeIdentifier().to_string()
}

#[cfg(not(target_os = "macos"))]
pub fn get_preferred_languages() -> Vec<String> {
    Vec::new()
}

#[cfg(not(target_os = "macos"))]
pub fn get_current_locale_identifier() -> String {
    String::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg_attr(not(target_os = "macos"), ignore)]
    fn test_get_preferred_languages() {
        let languages = get_preferred_languages();
        println!("Preferred languages: {:?}", languages);
        assert!(!languages.is_empty());
    }

    #[test]
    #[cfg_attr(not(target_os = "macos"), ignore)]
    fn test_get_current_locale_identifier() {
        let locale = get_current_locale_identifier();
        println!("Current locale: {}", locale);
        assert!(!locale.is_empty());
    }
}
