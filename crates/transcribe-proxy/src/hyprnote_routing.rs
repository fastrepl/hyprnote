use std::collections::HashSet;

use hypr_language::Language;
use owhisper_client::{AdapterKind, LanguageQuality, Provider};

const DEFAULT_NUM_RETRIES: usize = 2;
const DEFAULT_MAX_DELAY_SECS: u64 = 5;

#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub num_retries: usize,
    pub max_delay_secs: u64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            num_retries: DEFAULT_NUM_RETRIES,
            max_delay_secs: DEFAULT_MAX_DELAY_SECS,
        }
    }
}

#[derive(Debug, Clone)]
pub struct HyprnoteRoutingConfig {
    pub priorities: Vec<Provider>,
    pub retry_config: RetryConfig,
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
            retry_config: RetryConfig::default(),
        }
    }
}

pub struct HyprnoteRouter {
    priorities: Vec<Provider>,
    retry_config: RetryConfig,
}

impl HyprnoteRouter {
    pub fn new(config: HyprnoteRoutingConfig) -> Self {
        Self {
            priorities: config.priorities,
            retry_config: config.retry_config,
        }
    }

    pub fn select_provider(
        &self,
        languages: &[Language],
        available_providers: &HashSet<Provider>,
    ) -> Option<Provider> {
        self.select_provider_chain(languages, available_providers)
            .into_iter()
            .next()
    }

    pub fn select_provider_chain(
        &self,
        languages: &[Language],
        available_providers: &HashSet<Provider>,
    ) -> Vec<Provider> {
        let mut candidates: Vec<_> = self
            .priorities
            .iter()
            .copied()
            .filter_map(|p| {
                let quality = self.get_quality(&p, languages, available_providers);
                if quality.is_supported() {
                    Some((p, quality))
                } else {
                    None
                }
            })
            .collect();

        candidates.sort_by(|a, b| {
            let (p1, q1) = a;
            let (p2, q2) = b;
            match q2.cmp(q1) {
                std::cmp::Ordering::Equal => {
                    let idx1 = self
                        .priorities
                        .iter()
                        .position(|p| p == p1)
                        .unwrap_or(usize::MAX);
                    let idx2 = self
                        .priorities
                        .iter()
                        .position(|p| p == p2)
                        .unwrap_or(usize::MAX);
                    idx1.cmp(&idx2)
                }
                other => other,
            }
        });

        candidates.into_iter().map(|(p, _)| p).collect()
    }

    fn get_quality(
        &self,
        provider: &Provider,
        languages: &[Language],
        available_providers: &HashSet<Provider>,
    ) -> LanguageQuality {
        if !available_providers.contains(provider) {
            return LanguageQuality::NotSupported;
        }
        AdapterKind::from(*provider).language_quality_live(languages, None)
    }

    pub fn retry_config(&self) -> &RetryConfig {
        &self.retry_config
    }
}

impl Default for HyprnoteRouter {
    fn default() -> Self {
        Self::new(HyprnoteRoutingConfig::default())
    }
}

pub fn is_retryable_error(error: &str) -> bool {
    let error_lower = error.to_lowercase();

    let is_auth_error = error_lower.contains("401")
        || error_lower.contains("403")
        || error_lower.contains("unauthorized")
        || error_lower.contains("forbidden");

    let is_client_error = error_lower.contains("400") || error_lower.contains("invalid");

    if is_auth_error || is_client_error {
        return false;
    }

    error_lower.contains("timeout")
        || error_lower.contains("connection")
        || error_lower.contains("500")
        || error_lower.contains("502")
        || error_lower.contains("503")
        || error_lower.contains("504")
        || error_lower.contains("temporarily")
        || error_lower.contains("rate limit")
        || error_lower.contains("too many requests")
}

pub fn should_use_hyprnote_routing(provider_param: Option<&str>) -> bool {
    provider_param == Some("hyprnote")
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
    fn test_select_provider_filters_by_language_support() {
        let router = HyprnoteRouter::default();
        let available =
            make_available_providers(&[Provider::Deepgram, Provider::Soniox, Provider::AssemblyAI]);

        let ko_en: Vec<Language> = vec!["ko".parse().unwrap(), "en".parse().unwrap()];
        let selected = router.select_provider(&ko_en, &available);
        assert_eq!(selected, Some(Provider::Soniox));
    }

    #[test]
    fn test_select_provider_chain() {
        let router = HyprnoteRouter::default();
        let available =
            make_available_providers(&[Provider::Deepgram, Provider::Soniox, Provider::AssemblyAI]);
        let languages: Vec<Language> = vec!["en".parse().unwrap()];

        let chain = router.select_provider_chain(&languages, &available);
        assert_eq!(chain.len(), 3);
        assert_eq!(chain[0], Provider::Deepgram);
        assert_eq!(chain[1], Provider::Soniox);
        assert_eq!(chain[2], Provider::AssemblyAI);
    }

    #[test]
    fn test_should_use_hyprnote_routing_explicit_hyprnote() {
        assert!(super::should_use_hyprnote_routing(Some("hyprnote")));
    }

    #[test]
    fn test_should_use_hyprnote_routing_valid_provider() {
        assert!(!super::should_use_hyprnote_routing(Some("deepgram")));
        assert!(!super::should_use_hyprnote_routing(Some("soniox")));
        assert!(!super::should_use_hyprnote_routing(Some("assemblyai")));
    }

    #[test]
    fn test_should_use_hyprnote_routing_no_provider() {
        assert!(!super::should_use_hyprnote_routing(None));
    }

    #[test]
    fn test_should_use_hyprnote_routing_invalid_provider() {
        assert!(!super::should_use_hyprnote_routing(Some("invalid")));
        assert!(!super::should_use_hyprnote_routing(Some(
            "unknown_provider"
        )));
        assert!(!super::should_use_hyprnote_routing(Some("")));
        assert!(!super::should_use_hyprnote_routing(Some("auto")));
    }

    #[test]
    fn test_select_provider_prefers_quality_over_priority() {
        let router = HyprnoteRouter::default();
        let available =
            make_available_providers(&[Provider::Deepgram, Provider::Soniox, Provider::ElevenLabs]);

        let ko: Vec<Language> = vec!["ko".parse().unwrap()];
        let chain = router.select_provider_chain(&ko, &available);

        assert_eq!(chain[0], Provider::Soniox);
        assert_eq!(chain[1], Provider::Deepgram);
        assert_eq!(chain[2], Provider::ElevenLabs);
    }
}
