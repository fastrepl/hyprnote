use unicode_normalization::UnicodeNormalization;

#[derive(Debug, Clone, Default)]
pub struct WerResult {
    pub wer: f64,
    pub substitutions: usize,
    pub insertions: usize,
    pub deletions: usize,
    pub reference_words: usize,
    pub hypothesis_words: usize,
}

impl WerResult {
    pub fn is_acceptable(&self, threshold: f64) -> bool {
        self.wer <= threshold
    }
}

#[derive(Debug, Clone, Default)]
pub struct WerConfig {
    pub case_insensitive: bool,
    pub normalize_unicode: bool,
    pub remove_punctuation: bool,
    pub normalize_whitespace: bool,
}

impl WerConfig {
    pub fn default_for_language(lang: &str) -> Self {
        match lang {
            "ko" | "korean" => Self {
                case_insensitive: true,
                normalize_unicode: true,
                remove_punctuation: true,
                normalize_whitespace: true,
            },
            "de" | "german" => Self {
                case_insensitive: true,
                normalize_unicode: true,
                remove_punctuation: true,
                normalize_whitespace: true,
            },
            "ja" | "japanese" => Self {
                case_insensitive: true,
                normalize_unicode: true,
                remove_punctuation: true,
                normalize_whitespace: true,
            },
            "zh" | "chinese" => Self {
                case_insensitive: true,
                normalize_unicode: true,
                remove_punctuation: true,
                normalize_whitespace: true,
            },
            _ => Self {
                case_insensitive: true,
                normalize_unicode: true,
                remove_punctuation: true,
                normalize_whitespace: true,
            },
        }
    }
}

fn normalize_text(text: &str, config: &WerConfig) -> String {
    let mut result = text.to_string();

    if config.normalize_unicode {
        result = result.nfkc().collect();
    }

    if config.case_insensitive {
        result = result.to_lowercase();
    }

    if config.remove_punctuation {
        result = result
            .chars()
            .map(|c| {
                if c.is_alphanumeric() || c.is_whitespace() {
                    c
                } else {
                    ' '
                }
            })
            .collect();
    }

    if config.normalize_whitespace {
        result = result.split_whitespace().collect::<Vec<_>>().join(" ");
    }

    result
}

fn tokenize(text: &str) -> Vec<&str> {
    text.split_whitespace().collect()
}

fn levenshtein_distance(reference: &[&str], hypothesis: &[&str]) -> (usize, usize, usize) {
    let ref_len = reference.len();
    let hyp_len = hypothesis.len();

    let mut dp = vec![vec![(0usize, 0usize, 0usize); hyp_len + 1]; ref_len + 1];

    for i in 0..=ref_len {
        dp[i][0] = (i, 0, i);
    }
    for j in 0..=hyp_len {
        dp[0][j] = (j, j, 0);
    }

    for i in 1..=ref_len {
        for j in 1..=hyp_len {
            if reference[i - 1] == hypothesis[j - 1] {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                let sub = dp[i - 1][j - 1];
                let ins = dp[i][j - 1];
                let del = dp[i - 1][j];

                let sub_cost = sub.0 + sub.1 + sub.2 + 1;
                let ins_cost = ins.0 + ins.1 + ins.2 + 1;
                let del_cost = del.0 + del.1 + del.2 + 1;

                if sub_cost <= ins_cost && sub_cost <= del_cost {
                    dp[i][j] = (sub.0 + 1, sub.1, sub.2);
                } else if ins_cost <= del_cost {
                    dp[i][j] = (ins.0, ins.1 + 1, ins.2);
                } else {
                    dp[i][j] = (del.0, del.1, del.2 + 1);
                }
            }
        }
    }

    dp[ref_len][hyp_len]
}

pub fn calculate_wer(reference: &str, hypothesis: &str, config: &WerConfig) -> WerResult {
    let ref_normalized = normalize_text(reference, config);
    let hyp_normalized = normalize_text(hypothesis, config);

    let ref_words: Vec<&str> = tokenize(&ref_normalized);
    let hyp_words: Vec<&str> = tokenize(&hyp_normalized);

    if ref_words.is_empty() {
        return WerResult {
            wer: if hyp_words.is_empty() { 0.0 } else { 1.0 },
            substitutions: 0,
            insertions: hyp_words.len(),
            deletions: 0,
            reference_words: 0,
            hypothesis_words: hyp_words.len(),
        };
    }

    let (substitutions, insertions, deletions) = levenshtein_distance(&ref_words, &hyp_words);

    let total_errors = substitutions + insertions + deletions;
    let wer = total_errors as f64 / ref_words.len() as f64;

    WerResult {
        wer,
        substitutions,
        insertions,
        deletions,
        reference_words: ref_words.len(),
        hypothesis_words: hyp_words.len(),
    }
}

pub fn calculate_wer_default(reference: &str, hypothesis: &str) -> WerResult {
    calculate_wer(reference, hypothesis, &WerConfig::default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_perfect_match() {
        let result = calculate_wer_default("hello world", "hello world");
        assert_eq!(result.wer, 0.0);
        assert_eq!(result.substitutions, 0);
        assert_eq!(result.insertions, 0);
        assert_eq!(result.deletions, 0);
    }

    #[test]
    fn test_case_insensitive() {
        let result = calculate_wer_default("Hello World", "hello world");
        assert_eq!(result.wer, 0.0);
    }

    #[test]
    fn test_punctuation_removal() {
        let result = calculate_wer_default("Hello, world!", "hello world");
        assert_eq!(result.wer, 0.0);
    }

    #[test]
    fn test_substitution() {
        let result = calculate_wer_default("hello world", "hello earth");
        assert_eq!(result.substitutions, 1);
        assert_eq!(result.wer, 0.5);
    }

    #[test]
    fn test_insertion() {
        let result = calculate_wer_default("hello world", "hello big world");
        assert_eq!(result.insertions, 1);
        assert_eq!(result.wer, 0.5);
    }

    #[test]
    fn test_deletion() {
        let result = calculate_wer_default("hello big world", "hello world");
        assert_eq!(result.deletions, 1);
        assert!(result.wer > 0.3 && result.wer < 0.4);
    }

    #[test]
    fn test_korean_text() {
        let config = WerConfig::default_for_language("ko");
        let result = calculate_wer("안녕하세요 세계", "안녕하세요 세계", &config);
        assert_eq!(result.wer, 0.0);
    }

    #[test]
    fn test_german_text() {
        let config = WerConfig::default_for_language("de");
        let result = calculate_wer("Guten Tag", "guten tag", &config);
        assert_eq!(result.wer, 0.0);
    }

    #[test]
    fn test_empty_reference() {
        let result = calculate_wer_default("", "hello world");
        assert_eq!(result.wer, 1.0);
        assert_eq!(result.insertions, 2);
    }

    #[test]
    fn test_empty_hypothesis() {
        let result = calculate_wer_default("hello world", "");
        assert_eq!(result.wer, 1.0);
        assert_eq!(result.deletions, 2);
    }

    #[test]
    fn test_both_empty() {
        let result = calculate_wer_default("", "");
        assert_eq!(result.wer, 0.0);
    }

    #[test]
    fn test_acceptable_threshold() {
        let result = calculate_wer_default("hello world", "hello earth");
        assert!(result.is_acceptable(0.5));
        assert!(!result.is_acceptable(0.4));
    }
}
