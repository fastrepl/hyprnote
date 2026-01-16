use std::collections::{HashMap, HashSet};
use std::sync::RwLock;

use hypr_language::Language;
use owhisper_client::{AdapterKind, Provider};

const DEFAULT_FAILURE_THRESHOLD: u32 = 3;

#[derive(Debug, Clone)]
pub struct HyprnoteRoutingConfig {
    pub priorities: Vec<Provider>,
    pub failure_threshold: u32,
}

impl Default for HyprnoteRoutingConfig {
    fn default() -> Self {
        Self {
            priorities: vec![
                Provider::Deepgram,
                Provider::Soniox,
                Provider::AssemblyAI,
                Provider::Gladia,
                Provider::ElevenLabs,
                Provider::Fireworks,
                Provider::OpenAI,
            ],
            failure_threshold: DEFAULT_FAILURE_THRESHOLD,
        }
    }
}

pub struct HyprnoteRouter {
    priorities: Vec<Provider>,
    failure_threshold: u32,
    failure_counts: RwLock<HashMap<Provider, u32>>,
}

impl HyprnoteRouter {
    pub fn new(config: HyprnoteRoutingConfig) -> Self {
        Self {
            priorities: config.priorities,
            failure_threshold: config.failure_threshold,
            failure_counts: RwLock::new(HashMap::new()),
        }
    }

    pub fn select_provider(
        &self,
        languages: &[Language],
        available_providers: &HashSet<Provider>,
    ) -> Option<Provider> {
        self.priorities
            .iter()
            .filter(|p| available_providers.contains(p))
            .filter(|p| self.is_healthy(p))
            .filter(|p| {
                let adapter_kind = AdapterKind::from(**p);
                adapter_kind.is_supported_languages_live(languages, None)
            })
            .next()
            .copied()
    }

    fn is_healthy(&self, provider: &Provider) -> bool {
        let counts = self.failure_counts.read().unwrap();
        counts
            .get(provider)
            .map(|&count| count < self.failure_threshold)
            .unwrap_or(true)
    }

    pub fn record_failure(&self, provider: Provider) {
        let mut counts = self.failure_counts.write().unwrap();
        *counts.entry(provider).or_insert(0) += 1;
        tracing::warn!(
            provider = ?provider,
            failure_count = counts.get(&provider).copied().unwrap_or(0),
            "provider_failure_recorded"
        );
    }

    pub fn record_success(&self, provider: Provider) {
        let mut counts = self.failure_counts.write().unwrap();
        if counts.remove(&provider).is_some() {
            tracing::debug!(
                provider = ?provider,
                "provider_failure_count_reset"
            );
        }
    }

    pub fn priorities(&self) -> &[Provider] {
        &self.priorities
    }
}

impl Default for HyprnoteRouter {
    fn default() -> Self {
        Self::new(HyprnoteRoutingConfig::default())
    }
}

pub fn parse_languages(language_param: Option<&str>) -> Vec<Language> {
    language_param
        .map(|s| {
            s.split(',')
                .filter_map(|lang| lang.trim().parse::<Language>().ok())
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_available_providers(providers: &[Provider]) -> HashSet<Provider> {
        providers.iter().copied().collect()
    }

    #[test]
    fn test_select_provider_by_priority() {
        let router = HyprnoteRouter::default();
        let available = make_available_providers(&[Provider::Soniox, Provider::Deepgram]);
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        let selected = router.select_provider(&languages, &available);
        assert_eq!(selected, Some(Provider::Deepgram));
    }

    #[test]
    fn test_select_provider_fallback_when_first_unavailable() {
        let router = HyprnoteRouter::default();
        let available = make_available_providers(&[Provider::Soniox, Provider::AssemblyAI]);
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        let selected = router.select_provider(&languages, &available);
        assert_eq!(selected, Some(Provider::Soniox));
    }

    #[test]
    fn test_select_provider_none_when_no_available() {
        let router = HyprnoteRouter::default();
        let available = HashSet::new();
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        let selected = router.select_provider(&languages, &available);
        assert_eq!(selected, None);
    }

    #[test]
    fn test_select_provider_skips_unhealthy() {
        let router = HyprnoteRouter::default();
        let available = make_available_providers(&[Provider::Deepgram, Provider::Soniox]);
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        for _ in 0..DEFAULT_FAILURE_THRESHOLD {
            router.record_failure(Provider::Deepgram);
        }

        let selected = router.select_provider(&languages, &available);
        assert_eq!(selected, Some(Provider::Soniox));
    }

    #[test]
    fn test_record_success_resets_failure_count() {
        let router = HyprnoteRouter::default();
        let available = make_available_providers(&[Provider::Deepgram, Provider::Soniox]);
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        for _ in 0..DEFAULT_FAILURE_THRESHOLD {
            router.record_failure(Provider::Deepgram);
        }

        assert_eq!(
            router.select_provider(&languages, &available),
            Some(Provider::Soniox)
        );

        router.record_success(Provider::Deepgram);

        assert_eq!(
            router.select_provider(&languages, &available),
            Some(Provider::Deepgram)
        );
    }

    #[test]
    fn test_select_provider_filters_by_language_support() {
        let router = HyprnoteRouter::default();
        let available =
            make_available_providers(&[Provider::Deepgram, Provider::Soniox, Provider::AssemblyAI]);

        let ko_en: Vec<Language> = vec!["ko".parse().unwrap(), "en".parse().unwrap()];
        let selected = router.select_provider(&ko_en, &available);
        assert_eq!(selected, Some(Provider::Soniox));
    }

    #[test]
    fn test_parse_languages_single() {
        let languages = parse_languages(Some("en"));
        assert_eq!(languages.len(), 1);
        assert_eq!(languages[0].iso639_code(), "en");
    }

    #[test]
    fn test_parse_languages_multiple() {
        let languages = parse_languages(Some("en,ko,ja"));
        assert_eq!(languages.len(), 3);
        assert_eq!(languages[0].iso639_code(), "en");
        assert_eq!(languages[1].iso639_code(), "ko");
        assert_eq!(languages[2].iso639_code(), "ja");
    }

    #[test]
    fn test_parse_languages_with_region() {
        let languages = parse_languages(Some("en-US,ko-KR"));
        assert_eq!(languages.len(), 2);
        assert_eq!(languages[0].iso639_code(), "en");
        assert_eq!(languages[0].region(), Some("US"));
        assert_eq!(languages[1].iso639_code(), "ko");
        assert_eq!(languages[1].region(), Some("KR"));
    }

    #[test]
    fn test_parse_languages_empty() {
        let languages = parse_languages(None);
        assert!(languages.is_empty());

        let languages = parse_languages(Some(""));
        assert!(languages.is_empty());
    }

    #[test]
    fn test_parse_languages_with_whitespace() {
        let languages = parse_languages(Some("en, ko , ja"));
        assert_eq!(languages.len(), 3);
    }

    #[test]
    fn test_custom_priorities() {
        let config = HyprnoteRoutingConfig {
            priorities: vec![Provider::Soniox, Provider::Deepgram],
            failure_threshold: DEFAULT_FAILURE_THRESHOLD,
        };
        let router = HyprnoteRouter::new(config);
        let available = make_available_providers(&[Provider::Deepgram, Provider::Soniox]);
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        let selected = router.select_provider(&languages, &available);
        assert_eq!(selected, Some(Provider::Soniox));
    }
}
